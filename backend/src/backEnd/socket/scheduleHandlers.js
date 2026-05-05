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
  enforceFrozenSections
} from '../schedule/engine/index.js'
import {
  loadTeacherRestrictions,
  loadSubjectRestrictions,
  loadClassroomOverrides,
  loadLockedSections
} from '../schedule/loadRestrictions.js'

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

  // ─── regenerate ─────────────────────────────────────────────────────────
  socket.on('schedule:regenerate', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('missing generation payload')
      }

      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        mutator: async (state) => {
          // ─── Load restrictions from database ───
          const unavailableDays = await loadTeacherRestrictions()
          const preferredClassrooms = await loadSubjectRestrictions(proyectionId)
          const classroomOverrides = await loadClassroomOverrides(proyectionId)
          let lockedSections = await loadLockedSections(proyectionId)

          // ─── 1. SELF-HEAL locked sections ───
          // Sync professorId on locked events with current subject assignments
          // and remove phantom duplicates.
          const subjects = payload.subjects || []
          const healed = selfHealLockedSections(lockedSections, subjects, trimestre)
          lockedSections = healed.lockedSections

          // Flat list of locked events for the active trimestre + cross-quarter ghosts
          const lockedEventsActiveTrim = []
          for (const [key, events] of Object.entries(lockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedEventsActiveTrim.push(...events)
          }

          // Compute cross-quarter ghost events for this trimestre. They occupy
          // teacher/classroom slots without being part of the produced events.
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
            classrooms: payload.classrooms || [],
            trimestre,
            unavailableDays,
            preferredClassrooms,
            classroomOverrides,
            conserveSlots: payload.conserveSlots,
            minConsecutiveSlots: payload.minConsecutiveSlots,
            customDays: payload.customDays,
            customTurnos: payload.customTurnos,
            distributeEquitably: payload.distributeEquitably,
            teachers: payload.teachers,
            preventSingleHourBlocks: payload.preventSingleHourBlocks,
            breaks: payload.breaks,
            lockedEvents: [...lockedEventsActiveTrim, ...crossGhosts],
            setErrors: (e) => initialErrors.push(e)
          })

          // ─── 3. AUTO-SOLVE (pass 2 + pass 3) ───
          const solved = runAutoSolve({
            eventsdata: generated,
            initialErrors,
            loadedScheduleEvents: payload.loadedScheduleEvents || [],
            crossQuarterGhostEvents: crossGhosts,
            currentSubjects: subjects,
            activeTurnos: payload.customTurnos || {},
            scheduleConfig: payload.scheduleConfig || {},
            teacherRestrictions: unavailableDays,
            subjectRestriction: preferredClassrooms,
            classrooms: payload.classrooms || [],
            consecutiveConfig: {
              minSlots: payload.minConsecutiveSlots ?? 2,
              maxSlots: payload.conserveSlots ?? 3
            },
            trimestre,
            lockedSections
          })

          // ─── 4. PHANTOM CLEANUP ───
          let finalEvents = removePhantomEvents(solved.eventsdata)

          // ─── 5. FROZEN SECTIONS ENFORCEMENT ───
          finalEvents = enforceFrozenSections(finalEvents, lockedSections, trimestre)

          return {
            ...state,
            eventData: finalEvents,
            classroomOverrides,
            lockedSections,
            scheduleConfig: payload.scheduleConfig || state.scheduleConfig || {},
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

  // ─── classroom overrides ────────────────────────────────────────────────
  socket.on('schedule:saveOverride', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const newOverrides = Array.isArray(payload?.overrides) ? payload.overrides : null
      if (!newOverrides) throw new ValidationError('overrides must be an array')

      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        mutator: (state) => ({
          ...state,
          classroomOverrides: [...(state.classroomOverrides || []), ...newOverrides]
        })
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:deleteOverride', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion, payload } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const matcher = payload?.matcher
      if (!matcher || typeof matcher !== 'object') {
        throw new ValidationError('matcher is required')
      }
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        mutator: (state) => ({
          ...state,
          classroomOverrides: (state.classroomOverrides || []).filter((ov) =>
            !Object.entries(matcher).every(([k, v]) => ov[k] === v)
          )
        })
      })
      broadcastState(io, proyectionId, trimestre, result.version, result.state)
      ok({ version: result.version })
    } catch (err) {
      fail(err)
    }
  })

  socket.on('schedule:deleteAllOverrides', async (msg, ack) => {
    const { ok, fail } = makeResponders(ack)
    try {
      requireAuth(socket)
      const { proyectionId, trimestre, baseVersion } = msg || {}
      validateRoom({ proyectionId, trimestre })
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: Number(baseVersion ?? 0),
        mutator: (state) => ({ ...state, classroomOverrides: [] })
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

  // Re-export references for downstream introspection / testing.
  socket._scheduleHandlersInstalled = true
  void VersionConflictError // keep import used for docs
}
