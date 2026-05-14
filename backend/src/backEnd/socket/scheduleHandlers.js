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
import { recalcSchedulesForProyection, recalcSingleTrimestre } from '../schedule/scheduleService.js'

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
        mutator: async () => {
          // ─── Load ALL data from database ───
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

          // ─── 1. SELF-HEAL locked sections ───
          const healed = selfHealLockedSections(lockedSections, subjects, trimestre)
          lockedSections = healed.lockedSections

          // Flat locked events for the active trimestre
          const lockedEventsActiveTrim = []
          for (const [key, events] of Object.entries(lockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedEventsActiveTrim.push(...events)
          }

          // Cross-quarter ghosts
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

          // ─── 2. INITIAL GENERATION ───
          /** @type {import('../schedule/engine/types.js').ScheduleError[]} */
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

          // ─── 3. AUTO-SOLVE ───
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

          // ─── 4. PHANTOM CLEANUP ───
          let finalEvents = removePhantomEvents(solved.eventsdata)

          // ─── 5. FROZEN SECTIONS ENFORCEMENT ───
          finalEvents = enforceFrozenSections(finalEvents, lockedSections, trimestre)

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
  // Used by the frontend while the fine-grained drag/drop/staging actions
  // are still computed client-side. Removes the client→server race because
  // every write goes through `applyAction` with optimistic locking.
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
        mutator: () => ({ ...emptyState(), ...payload })
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // ─── classroom overrides (DB-backed + reactive recalc) ──────────────────
  // Overrides are persisted to the classroom_overrides DB table and a full
  // schedule recalculation is triggered so all connected clients receive the
  // updated state. The in-memory snapshot is no longer the source of truth.
  socket.on('schedule:saveOverride', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId required')
      const newOverrides = Array.isArray(payload?.overrides) ? payload.overrides : null
      if (!newOverrides) throw new ValidationError('overrides must be an array')

      for (const ov of newOverrides) {
        await ClassroomOverrides.create({
          proyection_id: proyectionId,
          subject_name: ov.subjectName || ov.subject_name,
          day: ov.day,
          start_time: ov.startTime || ov.start_time,
          end_time: ov.endTime || ov.end_time,
          classroom_id: ov.classroomId || ov.classroom_id,
          seccion: ov.seccion || null,
          pnf_id: ov.pnfId || ov.pnf_id || null,
          trayecto_id: ov.trayectoId || ov.trayecto_id || null
        })
      }

      recalcSchedulesForProyection(proyectionId, io)
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:deleteOverride', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId required')
      const matcher = payload?.matcher
      if (!matcher || typeof matcher !== 'object') {
        throw new ValidationError('matcher is required')
      }

      // Convert camelCase matcher keys to DB snake_case column names
      const where = { proyection_id: proyectionId }
      const keyMap = {
        id: 'id',
        subjectName: 'subject_name',
        day: 'day',
        startTime: 'start_time',
        endTime: 'end_time',
        classroomId: 'classroom_id',
        seccion: 'seccion',
        pnfId: 'pnf_id',
        trayectoId: 'trayecto_id'
      }
      for (const [k, v] of Object.entries(matcher)) {
        const col = keyMap[k] || k
        where[col] = v
      }

      await ClassroomOverrides.destroy({ where })

      recalcSchedulesForProyection(proyectionId, io)
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:deleteAllOverrides', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId } = msg || {}
      if (!proyectionId) throw new ValidationError('proyectionId required')

      await ClassroomOverrides.destroy({ where: { proyection_id: proyectionId } })

      recalcSchedulesForProyection(proyectionId, io)
      ok({})
    } catch (err) {
      fail(err)
    }
  })

  // ─── fine-grained atomic actions (Fase C) ──────────────────────────────
  //
  // Each of the following handlers performs a single, atomic mutation on the
  // schedule state via `applyAction`. They are versioned and broadcast just
  // like `schedule:setState`, but they avoid sending the entire snapshot and
  // make the intent explicit. The frontend can still optimistically apply
  // the change locally; on the inbound `schedule:state` broadcast the
  // authoritative state will overwrite any divergent client state.

  // Toggle freeze on a section. When `freeze=true`, the events of the given
  // section in the active trimestre are copied from `eventData` into
  // ─── freeze / unfreeze sections (DB-backed + reactive recalc) ────────────
  // Persists to `frozen_sections` table (not the schedule snapshot) and
  // triggers a full recalculation so all connected clients receive the updated
  // state. sectionKey format: `${pnfId}-${trayectoId}-${seccion}-${trimestre}`.
  //
  // Payload: { sectionKey: string, freeze: boolean, events?: ScheduleEvent[] }
  socket.on('schedule:toggleFreeze', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, payload } = msg || {}
      console.log('[schedule:toggleFreeze] received:', { proyectionId, payload })
      if (!proyectionId) throw new ValidationError('proyectionId required')
      const sectionKey = payload?.sectionKey
      const freeze = !!payload?.freeze
      if (typeof sectionKey !== 'string') {
        throw new ValidationError('sectionKey must be a string')
      }

      if (freeze) {
        let events = payload?.events
        if (!Array.isArray(events) || events.length === 0) {
          const existing = await LockedSections.findOne({
            where: { proyection_id: proyectionId, section_key: sectionKey }
          })
          events = existing?.events || []
        }
        await LockedSections.upsert({
          proyection_id: proyectionId,
          section_key: sectionKey,
          events,
          stage: 'planning'
        })
      } else {
        await LockedSections.destroy({
          where: { proyection_id: proyectionId, section_key: sectionKey }
        })
      }

      // Extract the trimestre from the sectionKey so we only recalculate the
      // affected trimestre instead of all three. This prevents version
      // conflicts when the user toggles multiple sections rapidly.
      const trimFromKey = sectionKey.split('-').pop()
      const affectedTrimestre = TRIM_VALUES.has(trimFromKey) ? trimFromKey : null

      console.log('[schedule:toggleFreeze] DB write done, calling recalc for', affectedTrimestre || 'all')
      // Recalc in the background so the client gets the ack immediately.
      // The client already updated its local lockedSections optimistically.
      const recalcPromise = affectedTrimestre
        ? recalcSingleTrimestre(proyectionId, io, affectedTrimestre)
        : recalcSchedulesForProyection(proyectionId, io)

      recalcPromise
        .then(() => console.log('[schedule:toggleFreeze] recalc done'))
        .catch((err) => console.error('[schedule:toggleFreeze] recalc failed:', err))

      ok({})
    } catch (err) {
      console.error('[schedule:toggleFreeze] error:', err)
      fail(err)
    }
  })

  // Move events from `eventData` to `stagedEvents`. Events are matched by id
  // (`subjectId-seccion-day-startTime`). Events not present in eventData are
  // ignored silently.
  //
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

  // Move events from `stagedEvents` back to `eventData`.
  //
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

  // Clear all events from `stagedEvents`.
  //
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
        mutator: (state) => ({ ...state, stagedEvents: [] })
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  // Change the classroom of one or more events. Events are identified by id.
  // The classroomId/classroomName are written into `extendedProps`.
  //
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
      const apply = (events) => events.map(ev => {
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
        mutator: (state) => {
          // Update both eventData and lockedSections so frozen sections
          // also reflect the new classroom.
          const lockedSections = { ...(state.lockedSections || {}) }
          for (const [key, evs] of Object.entries(lockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedSections[key] = apply(evs)
          }
          return {
            ...state,
            eventData: apply(state.eventData || []),
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
  // The new event id is recomputed from (subjectId, seccion, day, startTime).
  // No conflict validation is performed here — the frontend pre-validates
  // for instant UX and the optimistic version check guarantees ordering.
  //
  // Payload: {
  //   eventId: string,
  //   targetDay: number,
  //   targetStartTime: string,
  //   targetEndTime: string,
  //   targetClassroomId: string,
  //   targetClassroomName?: string
  // }
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

      recalcSchedulesForProyection(proyectionId, io)
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

      recalcSchedulesForProyection(proyectionId, io)
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
      await recalcSchedulesForProyection(proyectionId, io)
      console.log('[schedule:saveConfig] recalc done')
      ok({})
    } catch (err) {
      console.error('[schedule:saveConfig] error:', err)
      fail(err)
    }
  })

  // Re-export references for downstream introspection / testing.
  socket._scheduleHandlersInstalled = true
  void VersionConflictError // keep import used for docs
}
