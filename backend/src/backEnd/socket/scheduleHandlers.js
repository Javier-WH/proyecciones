// =====================================================
// Socket.IO handlers for the backend-driven schedule.
//
// Room naming: `schedule:<proyectionId>:<trimestre>`.
// Envelope for every action:
//   client → server: socket.emit(name, { baseVersion, payload }, ack)
//   server → client ack: { ok: true, version }
//                      | { ok: false, code, message, currentVersion? }
//   server → room broadcast: 'schedule:state', { version, state }
//
// This file registers the following actions. Each handler goes through
// `applyAction` in the state service, so optimistic locking is enforced
// uniformly and room broadcasts happen atomically after a successful write.
//
//   schedule:join               join the room + receive current snapshot
//   schedule:leave              leave the room
//   schedule:getState           resend the current snapshot to the caller
//   schedule:regenerate         run the engine, replace eventData
//   schedule:setState           escape hatch — replace the full state
//                               (used by the frontend while the remaining
//                               fine-grained actions are being ported)
//   schedule:saveOverride       add/replace a classroom override
//   schedule:deleteOverride     remove overrides by id/key
//   schedule:deleteAllOverrides clear classroomOverrides
//
// TODO (future sessions, see plan §2):
//   schedule:dropBetweenCells, schedule:dropFromStaging,
//   schedule:moveToStaging, schedule:returnFromStaging,
//   schedule:clearStaging, schedule:confirmOfficialStage,
//   schedule:toggleFreeze, schedule:changeClassroom,
//   schedule:updateConfig, schedule:saveTeacherRestriction,
//   schedule:saveSubjectRestriction
// =====================================================

import {
  getState,
  applyAction,
  getVersions,
  getVersionState,
  saveManualVersion,
  VersionConflictError,
  ValidationError,
  emptyState
} from '../schedule/stateService.js'
import {
  generateScheduleEvents,
  buildCrossQuarterGhostEvents,
  selfHealLockedSections,
  runAutoSolve,
  removePhantomEvents,
  enforceFrozenSections,
  computeLockedSectionsHash,
  getEventId as scheduleEventId
} from '../schedule/engine/index.js'
import {
  loadTeacherRestrictions,
  loadSubjectRestrictions,
  loadClassroomOverrides,
  loadLockedSections
} from '../schedule/loadRestrictions.js'
import TeachersRestrictions from '#models/schedule/teacherRestrictions.js'
import SubjectRestrictions from '#models/schedule/subjectsRestrictions.js'
import ClassroomOverrides from '#models/schedule/classroomOverrides.js'
import ScheduleConfig from '#models/schedule/scheduleConfig.js'
import Classrooms from '#models/schedule/classrooms.js'
import Proyections from '#models/proyections.js'
import LockedSections from '#models/schedule/lockedSections.js'
import getTeacherList from '#querys/teachers/getTeacherList.js'
import { recalcSchedulesForProyection, recalcSingleTrimestre, clearRecalcCache } from '../schedule/scheduleService.js'

const TRIM_VALUES = new Set(['q1', 'q2', 'q3'])

/**
 * Require an authenticated session unless running in dev mode. Mirrors the
 * existing check in `socket.js`.
 * @param {import('socket.io').Socket} socket
 */
function requireAuth (socket) {
  if (process.env.NODE_ENV === 'dev') return
  const user = socket?.request?.session?.user
  if (!user) {
    const err = new Error('No autenticado')
    err.code = 'FORBIDDEN'
    throw err
  }
}

/**
 * @param {{ proyectionId: string, trimestre: string }} meta
 */
function validateRoom (meta) {
  if (!meta || typeof meta !== 'object') throw new ValidationError('missing room metadata')
  if (typeof meta.proyectionId !== 'string' || !meta.proyectionId) {
    throw new ValidationError('invalid proyectionId')
  }
  if (!TRIM_VALUES.has(meta.trimestre)) {
    throw new ValidationError('invalid trimestre')
  }
}

function roomName (proyectionId, trimestre) {
  return `schedule:${proyectionId}:${trimestre}`
}

/**
 * Broadcast the current snapshot to every socket in a room.
 * @param {import('socket.io').Server} io
 * @param {string} proyectionId
 * @param {string} trimestre
 * @param {number} version
 * @param {import('../schedule/stateTypes.js').ScheduleState} state
 */
function broadcastState (io, proyectionId, trimestre, version, state) {
  io.to(roomName(proyectionId, trimestre)).emit('schedule:state', {
    proyectionId,
    trimestre,
    version,
    state
  })
}

/**
 * Build the ack + error helpers.
 * @param {Function | undefined} ack
 */
function makeResponders (ack) {
  const ok = (payload) => { if (typeof ack === 'function') ack({ ok: true, ...payload }) }
  const fail = (err) => {
    if (typeof ack !== 'function') return
    ack({
      ok: false,
      code: err.code || 'INTERNAL',
      message: err.message,
      ...(err.currentVersion !== undefined ? { currentVersion: err.currentVersion } : {})
    })
  }
  return { ok, fail }
}

/**
 * Register all schedule handlers on a newly-connected socket.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerScheduleHandlers (io, socket) {
  // ─── join / leave ───────────────────────────────────────────────────────
  socket.on('schedule:join', async (meta, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      validateRoom(meta)
      const room = roomName(meta.proyectionId, meta.trimestre)
      socket.join(room)
      const { version, state } = await getState(meta.proyectionId, meta.trimestre)
      socket.emit('schedule:state', {
        proyectionId: meta.proyectionId,
        trimestre: meta.trimestre,
        version,
        state
      })
      ok({ version })

      // Cold-start: if the schedule has never been computed for this room,
      // kick off a reactive recalc so the client receives data shortly.
      if (version === 0 || !state?.eventData || state.eventData.length === 0) {
        recalcSchedulesForProyection(meta.proyectionId, io)
          .catch(err => console.error('[schedule:join] cold-start recalc failed:', err.message))
      }
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:leave', (meta, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      validateRoom(meta)
      socket.leave(roomName(meta.proyectionId, meta.trimestre))
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:getState', async (meta, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      validateRoom(meta)
      const { version, state } = await getState(meta.proyectionId, meta.trimestre)
      ok({ version, state })
    } catch (err) {
      fail(err)
    }
  })

  // ─── regenerate (backend-driven) ─────────────────────────────────────────
  // Loads ALL data from the database: subjects, classrooms, teachers,
  // restrictions, overrides, config, and locked sections. No client payload
  // is required beyond proyectionId + trimestre. The result is persisted
  // via applyAction and broadcast to the room.
  socket.on('schedule:regenerate', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion } = msg || {}
      validateRoom({ proyectionId, trimestre })

      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'regenerate',
        mutator: async () => {
          const proyection = await Proyections.findOne({ where: { id: proyectionId }, raw: true })
          if (!proyection) throw new ValidationError('proyection not found')
          const subjects = JSON.parse(proyection.subjects || '[]')
          if (subjects.length === 0) {
            return { eventData: [], stagedEvents: [], lockedSections: {}, classroomOverrides: [], scheduleConfig: {}, lastGenerationErrors: [] }
          }

          const classrooms = await Classrooms.findAll({ raw: true })
          const teachers = await getTeacherList()
          const scheduleConfigRow = await ScheduleConfig.findOne({ where: { active: true }, raw: true })
          const scheduleConfig = scheduleConfigRow || {}

          const unavailableDays = await loadTeacherRestrictions()
          const preferredClassrooms = await loadSubjectRestrictions(proyectionId)
          const classroomOverrides = await loadClassroomOverrides(proyectionId)
          let lockedSections = await loadLockedSections(proyectionId)

          const config = {
            conserveSlots: scheduleConfig.conserve_slots ?? 3,
            minConsecutiveSlots: scheduleConfig.min_consecutive_slots ?? 2,
            customDays: scheduleConfig.days || [1, 2, 3, 4, 5],
            customTurnos: scheduleConfig.turnos || {},
            distributeEquitably: scheduleConfig.distribute_equitably || false,
            preventSingleHourBlocks: scheduleConfig.prevent_single_hour_blocks || false,
            breaks: scheduleConfig.breaks || []
          }

          const healed = selfHealLockedSections(lockedSections, subjects, trimestre)
          lockedSections = healed.lockedSections
          if (healed.warnings.length > 0) {
            console.warn('[scheduleHandlers] Frozen section validation warnings:', healed.warnings)
          }

          const lockedEventsActiveTrim = []
          for (const [key, events] of Object.entries(lockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedEventsActiveTrim.push(...events)
          }

          let crossGhosts = []
          try {
            const allLockedEvents = []
            for (const events of Object.values(lockedSections)) allLockedEvents.push(...events)
            crossGhosts = buildCrossQuarterGhostEvents({
              activeTrimestre: trimestre,
              allEvents: allLockedEvents,
              lockedSectionsFlat: Object.entries(lockedSections).map(([key, events]) => ({ key, events })),
              eventDataCurrent: [],
              subjects
            }) || []
          } catch (e) {
            console.warn('[regenerate] crossQuarterGhost computation failed', e)
          }

          const initialErrors = []
          const generated = generateScheduleEvents({
            subjects,
            classrooms,
            trimestre,
            unavailableDays,
            preferredClassrooms,
            classroomOverrides,
            conserveSlots: config.conserveSlots,
            minConsecutiveSlots: config.minConsecutiveSlots,
            customDays: config.customDays,
            customTurnos: config.customTurnos,
            distributeEquitably: config.distributeEquitably,
            teachers,
            preventSingleHourBlocks: config.preventSingleHourBlocks,
            breaks: config.breaks,
            lockedEvents: [...lockedEventsActiveTrim, ...crossGhosts],
            setErrors: (e) => initialErrors.push(e)
          })

          const solved = runAutoSolve({
            eventsdata: generated,
            initialErrors,
            loadedScheduleEvents: [],
            crossQuarterGhostEvents: crossGhosts,
            currentSubjects: subjects,
            activeTurnos: config.customTurnos,
            scheduleConfig,
            teacherRestrictions: unavailableDays,
            subjectRestriction: preferredClassrooms,
            classrooms,
            consecutiveConfig: {
              minSlots: config.minConsecutiveSlots,
              maxSlots: config.conserveSlots
            },
            trimestre,
            lockedSections
          })

          let finalEvents = removePhantomEvents(solved.eventsdata)

          const hashBefore = computeLockedSectionsHash(lockedSections)
          finalEvents = enforceFrozenSections(finalEvents, lockedSections, trimestre)
          const hashAfter = computeLockedSectionsHash(lockedSections)
          if (hashBefore !== hashAfter) {
            console.error(
              '[scheduleHandlers] FROZEN SECTION MUTATION DETECTED! ' +
              `Locked sections hash changed during recalc for trimestre ${trimestre}. ` +
              'This violates the invariant that frozen sections are immutable. ' +
              `Hash before: ${hashBefore}, Hash after: ${hashAfter}`
            )
          }

          return {
            eventData: finalEvents,
            stagedEvents: [],
            classroomOverrides,
            lockedSections,
            scheduleConfig,
            lastGenerationErrors: solved.errors
          }
        }
      })

      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // ─── escape-hatch: replace full state ───────────────────────────────────
  socket.on('schedule:setState', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('missing state payload')
      }
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'setState',
        mutator: () => ({ ...emptyState(), ...payload })
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // ─── fine-grained atomic actions ─────────────────────────────────────────

  // Move events from eventData to stagedEvents.
  // Payload: { eventIds: string[] }
  socket.on('schedule:moveToStaging', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const ids = Array.isArray(payload?.eventIds) ? payload.eventIds : null
      if (!ids || ids.length === 0) throw new ValidationError('eventIds must be a non-empty array')

      const idSet = new Set(ids)
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'moveToStaging',
        mutator: (state) => {
          const eventData = state.eventData || []
          const stagedEvents = state.stagedEvents || []
          const movedEvents = []
          const remaining = []
          for (const ev of eventData) {
            if (idSet.has(scheduleEventId(ev))) movedEvents.push(ev)
            else remaining.push(ev)
          }
          return {
            ...state,
            eventData: remaining,
            stagedEvents: [...stagedEvents, ...movedEvents]
          }
        }
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // Move events from stagedEvents back to eventData.
  // Payload: { eventIds: string[] }
  socket.on('schedule:returnFromStaging', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const ids = Array.isArray(payload?.eventIds) ? payload.eventIds : null
      if (!ids || ids.length === 0) throw new ValidationError('eventIds must be a non-empty array')

      const idSet = new Set(ids)
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'returnFromStaging',
        mutator: (state) => {
          const stagedEvents = state.stagedEvents || []
          const returned = []
          const remaining = []
          for (const ev of stagedEvents) {
            if (idSet.has(scheduleEventId(ev))) returned.push(ev)
            else remaining.push(ev)
          }
          return {
            ...state,
            eventData: [...(state.eventData || []), ...returned],
            stagedEvents: remaining
          }
        }
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // Clear all events from stagedEvents.
  // Payload: {}
  socket.on('schedule:clearStaging', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'clearStaging',
        mutator: (state) => ({ ...state, stagedEvents: [] })
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // Change the classroom of one or more events.
  // Payload: { eventIds: string[], classroomId: string, classroomName: string }
  socket.on('schedule:changeClassroom', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const ids = Array.isArray(payload?.eventIds) ? payload.eventIds : null
      const classroomId = payload?.classroomId
      const classroomName = payload?.classroomName
      if (!ids || ids.length === 0) throw new ValidationError('eventIds must be a non-empty array')
      if (!classroomId) throw new ValidationError('classroomId is required')

      const idSet = new Set(ids)
      const applyFn = (events) => events.map(ev => {
        if (!idSet.has(scheduleEventId(ev))) return ev
        return {
          ...ev,
          extendedProps: {
            ...(ev.extendedProps || {}),
            classroomId,
            classroomName: classroomName || ev.extendedProps?.classroomName
          }
        }
      })

      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'changeClassroom',
        mutator: (state) => {
          const lockedSections = { ...(state.lockedSections || {}) }
          for (const [key, evs] of Object.entries(lockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedSections[key] = applyFn(evs)
          }
          return {
            ...state,
            eventData: applyFn(state.eventData || []),
            lockedSections
          }
        }
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // Drop a single event onto a new (day, startTime, endTime, classroom).
  // Payload: { eventId, targetDay, targetStartTime, targetEndTime, targetClassroomId, targetClassroomName? }
  socket.on('schedule:dropEvent', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const {
        eventId, targetDay, targetStartTime, targetEndTime,
        targetClassroomId, targetClassroomName
      } = payload || {}
      if (!eventId) throw new ValidationError('eventId is required')
      if (typeof targetDay !== 'number') throw new ValidationError('targetDay must be a number')
      if (!targetStartTime || !targetEndTime) throw new ValidationError('targetStartTime/targetEndTime required')
      if (!targetClassroomId) throw new ValidationError('targetClassroomId required')

      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'dropEvent',
        mutator: (state) => {
          const updateEvent = (ev) => {
            if (scheduleEventId(ev) !== eventId) return ev
            return {
              ...ev,
              daysOfWeek: [targetDay],
              startTime: targetStartTime,
              endTime: targetEndTime,
              extendedProps: {
                ...(ev.extendedProps || {}),
                classroomId: targetClassroomId,
                classroomName: targetClassroomName || ev.extendedProps?.classroomName
              }
            }
          }
          const lockedSections = { ...(state.lockedSections || {}) }
          for (const [key, evs] of Object.entries(lockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedSections[key] = evs.map(updateEvent)
          }
          return {
            ...state,
            eventData: (state.eventData || []).map(updateEvent),
            stagedEvents: (state.stagedEvents || []).map(updateEvent),
            lockedSections
          }
        }
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  socket.on('error', (err) => {
    console.log('[scheduleHandlers] socket error:', err)
  })

  // ─── restriction / config persistence + reactive recalc ────────────────
  // These handlers replace the frontend's generationCounter++ pattern.
  // Each persists the data to DB and triggers a full schedule recalculation.

  socket.on('schedule:saveTeacherRestrictions', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId required')
      const restrictions = Array.isArray(payload?.restrictions) ? payload.restrictions : null
      if (!restrictions) throw new ValidationError('restrictions must be an array')

      for (const r of restrictions) {
        await TeachersRestrictions.upsert({
          teacher_id: r.teacherId,
          restricted_days: r.days || [],
          restricted_hours: r.hours || []
        })
      }

      clearRecalcCache(proyectionId)
      recalcSchedulesForProyection(proyectionId, io)
        .catch(err => console.error('[saveTeacherRestrictions] recalc failed:', err.message))
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:saveSubjectRestrictions', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId required')
      const restrictions = Array.isArray(payload?.restrictions) ? payload.restrictions : null
      if (!restrictions) throw new ValidationError('restrictions must be an array')

      for (const r of restrictions) {
        await SubjectRestrictions.upsert({
          proyection_id: proyectionId,
          subject_key: r.subjectKey,
          subject_name: r.subjectName,
          classroom_ids: r.classroomIds || [],
          pnf_id: r.pnfId || null,
          is_exclusive: r.isExclusive || false,
          split_hours: r.splitHours || false
        })
      }

      clearRecalcCache(proyectionId)
      recalcSchedulesForProyection(proyectionId, io)
        .catch(err => console.error('[saveSubjectRestrictions] recalc failed:', err.message))
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:saveConfig', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      console.log('[schedule:saveConfig] received:', { proyectionId, configKeys: Object.keys(payload?.config || {}) })
      if (!proyectionId) throw new ValidationError('proyectionId required')
      const config = payload?.config
      if (!config || typeof config !== 'object') throw new ValidationError('config required')

      await ScheduleConfig.upsert({
        id: config.id,
        days: config.days,
        turnos: config.turnos,
        conserve_slots: config.conserve_slots,
        min_consecutive_slots: config.min_consecutive_slots,
        active: config.active !== false,
        distribute_equitably: config.distribute_equitably || false,
        prevent_single_hour_blocks: config.prevent_single_hour_blocks || false,
        auto_solve: config.auto_solve || false,
        breaks: config.breaks || []
      })

      console.log('[schedule:saveConfig] upsert done, calling recalc')
      clearRecalcCache(proyectionId)
      await recalcSchedulesForProyection(proyectionId, io)
      console.log('[schedule:saveConfig] recalc done')
      ok({})
    } catch (err) {
      console.error('[schedule:saveConfig] error:', err)
      fail(err)
    }
  })

  // ─── version history ──────────────────────────────────────────────────────

  // Return the last 100 versions for the current (proyectionId, trimestre).
  // Used by the "Abrir" button on the frontend to display available snapshots.
  //
  // Payload: {}
  socket.on('schedule:getVersions', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const versions = await getVersions(proyectionId, trimestre)
      ok({ versions })
    } catch (err) {
      fail(err)
    }
  })

  // Restore a previous version by its id. Loads the version's state snapshot
  // and writes it via applyAction (which will in turn create a new version
  // snapshot of the state before the restore).
  //
  // Payload: { versionId: string }
  socket.on('schedule:restoreVersion', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const versionId = payload?.versionId
      if (!versionId) throw new ValidationError('versionId is required')

      const versionState = await getVersionState(versionId)
      if (!versionState) throw new ValidationError('version not found or has no data')

      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        changeType: 'restore',
        changeDescription: `Restauró versión ${versionId}`,
        mutator: () => versionState,
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // Manually save a named version snapshot. Used by the "Guardar" button.
  // The frontend sends a description (name). The current state is read from
  // the DB and saved as a version.
  //
  // Payload: { description?: string }
  socket.on('schedule:saveManualVersion', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const description = payload?.description || null

      const { state } = await getState(proyectionId, trimestre)
      await saveManualVersion({
        proyectionId,
        trimestre,
        state,
        changeType: 'manual',
        description,
      })
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  // ─── classroom overrides ──────────────────────────────────────────────────
  // Save classroom overrides (bulk replace). This replaces all overrides for
  // the projection with the provided array and broadcasts the updated state
  // to all connected clients.
  //
  // Payload: { overrides: ClassroomOverride[] }
  socket.on('schedule:saveOverride', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId is required')
      const overrides = payload?.overrides
      if (!Array.isArray(overrides)) throw new ValidationError('overrides must be an array')

      // Replace all overrides for the projection
      await ClassroomOverrides.destroy({ where: { proyection_id: proyectionId } })
      if (overrides.length > 0) {
        const records = overrides.map(ov => ({
          id: ov.id,
          subject_name: ov.subject_name,
          day: ov.day,
          start_time: ov.start_time,
          end_time: ov.end_time,
          classroom_id: ov.classroom_id,
          seccion: ov.seccion || null,
          pnf_id: ov.pnf_id || null,
          trayecto_id: ov.trayecto_id || null,
          proyection_id: proyectionId,
        }))
        await ClassroomOverrides.bulkCreate(records)
      }

      // Broadcast updated state to all trimestres for this projection
      for (const trim of TRIM_VALUES) {
        const { version, state } = await getState(proyectionId, trim)
        const updatedOverrides = await loadClassroomOverrides(proyectionId)
        const updatedState = { ...state, classroomOverrides: updatedOverrides }
        broadcastState(io, proyectionId, trim, version, updatedState)
      }

      ok({})
    } catch (err) {
      console.error('[schedule:saveOverride] error:', err)
      fail(err)
    }
  })

  // Delete specific classroom overrides by their IDs.
  //
  // Payload: { ids: string[] }
  socket.on('schedule:deleteOverride', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId is required')
      const ids = payload?.ids
      if (!Array.isArray(ids) || ids.length === 0) throw new ValidationError('ids must be a non-empty array')

      await ClassroomOverrides.destroy({ where: { id: ids } })

      // Broadcast updated state to all trimestres for this projection
      for (const trim of TRIM_VALUES) {
        const { version, state } = await getState(proyectionId, trim)
        const updatedOverrides = await loadClassroomOverrides(proyectionId)
        const updatedState = { ...state, classroomOverrides: updatedOverrides }
        broadcastState(io, proyectionId, trim, version, updatedState)
      }

      ok({})
    } catch (err) {
      console.error('[schedule:deleteOverride] error:', err)
      fail(err)
    }
  })

  // Delete all classroom overrides for a projection.
  //
  // Payload: {}
  socket.on('schedule:deleteAllOverrides', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId is required')

      await ClassroomOverrides.destroy({ where: { proyection_id: proyectionId } })

      // Broadcast updated state to all trimestres for this projection
      for (const trim of TRIM_VALUES) {
        const { version, state } = await getState(proyectionId, trim)
        const updatedOverrides = await loadClassroomOverrides(proyectionId)
        const updatedState = { ...state, classroomOverrides: updatedOverrides }
        broadcastState(io, proyectionId, trim, version, updatedState)
      }

      ok({})
    } catch (err) {
      console.error('[schedule:deleteAllOverrides] error:', err)
      fail(err)
    }
  })

  // Re-export references for downstream introspection / testing.
  socket._scheduleHandlersInstalled = true
  void VersionConflictError // keep import used for docs
}
