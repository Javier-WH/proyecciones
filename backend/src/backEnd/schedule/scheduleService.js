import Proyections from '#models/proyections.js'
import Classrooms from '#models/schedule/classrooms.js'
import ScheduleConfig from '#models/schedule/scheduleConfig.js'
import getTeacherList from '#querys/teachers/getTeacherList.js'
import { applyAction, getState } from './stateService.js'
import {
  generateScheduleEvents,
  buildCrossQuarterGhostEvents,
  selfHealLockedSections,
  runAutoSolve,
  removePhantomEvents,
  enforceFrozenSections,
  computeLockedSectionsHash,
  getEventId
} from './engine/index.js'
import {
  loadTeacherRestrictions,
  loadSubjectRestrictions,
  loadClassroomOverrides,
  loadLockedSections
} from './loadRestrictions.js'

const TRIMESTRES = ['q1', 'q2', 'q3']
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Recalc context cache ─────────────────────────────────────────────
// Static context (subjects, classrooms, teachers, config, restrictions)
// rarely changes between recalculations.  We cache it per proyectionId
// and only reload lockedSections + classroomOverrides on each call.
// When the cache is explicitly invalidated (clearRecalcCache), the next
// recalc loads everything fresh.

/** @type {Map<string, {static: RecalcContext, timestamp: number}>} */
const recalcCache = new Map()

/**
 * Load the full recalc context from DB (7 queries).
 * @param {string} proyectionId
 * @returns {Promise<RecalcContext|null>}
 */
async function loadRecalcContext (proyectionId) {
  const proyection = await Proyections.findOne({ where: { id: proyectionId }, raw: true })
  if (!proyection) { console.warn('[scheduleService] proyection not found:', proyectionId); return null }

  const subjects = JSON.parse(proyection.subjects || '[]')
  if (subjects.length === 0) { console.warn('[scheduleService] no subjects in proyection'); return null }

  const classrooms = await Classrooms.findAll({ raw: true })
  const teachers = await getTeacherList()
  const scheduleConfigRow = await ScheduleConfig.findOne({ where: { active: true }, raw: true })
  const scheduleConfig = scheduleConfigRow || {}

  const unavailableDays = await loadTeacherRestrictions()
  const preferredClassrooms = await loadSubjectRestrictions(proyectionId)
  const classroomOverrides = await loadClassroomOverrides(proyectionId)
  const lockedSections = await loadLockedSections(proyectionId)

  return {
    subjects,
    classrooms,
    teachers,
    scheduleConfig,
    unavailableDays,
    preferredClassrooms,
    classroomOverrides,
    lockedSections
  }
}

/**
 * Get recalc context with caching.
 * On first call or after invalidation: full DB load (7 queries).
 * On subsequent calls within TTL: reuses static context, refreshes
 * only lockedSections + classroomOverrides (2 queries).
 *
 * @param {string} proyectionId
 * @returns {Promise<RecalcContext|null>}
 */
async function getRecalcContext (proyectionId) {
  const cached = recalcCache.get(proyectionId)
  const now = Date.now()

  if (!cached || (now - cached.timestamp > CACHE_TTL_MS)) {
    const fresh = await loadRecalcContext(proyectionId)
    if (!fresh) return null
    recalcCache.set(proyectionId, { static: fresh, timestamp: now })
    // Debug log events on full load
    for (const [key, events] of Object.entries(fresh.lockedSections)) {
      for (const ev of events) {
        console.log('[loadRecalcContext] lockedSection', key, 'event', ev.title, 'day', ev.daysOfWeek?.[0], 'start', ev.startTime, 'classroomId', ev.extendedProps?.classroomId, 'classroomName', ev.extendedProps?.classroomName)
      }
    }
    return fresh
  }

  // Reuse static context, refresh only the dynamic parts
  const ctx = { ...cached.static }
  ctx.lockedSections = await loadLockedSections(proyectionId)
  ctx.classroomOverrides = await loadClassroomOverrides(proyectionId)
  recalcCache.set(proyectionId, { static: ctx, timestamp: now })

  for (const [key, events] of Object.entries(ctx.lockedSections)) {
    for (const ev of events) {
      console.log('[loadRecalcContext] lockedSection', key, 'event', ev.title, 'day', ev.daysOfWeek?.[0], 'start', ev.startTime, 'classroomId', ev.extendedProps?.classroomId, 'classroomName', ev.extendedProps?.classroomName)
    }
  }
  return ctx
}

/**
 * Invalidate the cached recalc context so the next call loads everything
 * fresh from the DB. Call this when subjects, classrooms, restrictions,
 * or config change globally.
 *
 * @param {string} [proyectionId] — if omitted, clears the entire cache
 */
export function clearRecalcCache (proyectionId) {
  if (proyectionId) {
    recalcCache.delete(proyectionId)
  } else {
    recalcCache.clear()
  }
}

/**
 * Compute the delta between old and new schedule state.
 * Returns null if the delta is not significantly smaller than the full state.
 *
 * @param {object} oldState
 * @param {object} newState
 * @returns {object|null}
 */
function computeStateDelta (oldState, newState) {
  const oldEvents = oldState?.eventData || []
  const newEvents = newState?.eventData || []

  const oldMap = new Map()
  for (const e of oldEvents) {
    const id = getEventId(e)
    if (id) oldMap.set(id, e)
  }

  const newMap = new Map()
  for (const e of newEvents) {
    const id = getEventId(e)
    if (id) newMap.set(id, e)
  }

  const added = []
  const removed = []
  const changed = []

  for (const [id, newEv] of newMap) {
    const oldEv = oldMap.get(id)
    if (!oldEv) {
      added.push(newEv)
    } else if (JSON.stringify(oldEv) !== JSON.stringify(newEv)) {
      changed.push(newEv)
    }
  }

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      removed.push(id)
    }
  }

  const totalDelta = added.length + removed.length + changed.length
  const totalNew = newEvents.length

  // Only use delta if it's at most 30% of the full state size
  if (totalNew === 0 || totalDelta > totalNew * 0.3) return null

  const delta = { eventData: {} }
  if (added.length) delta.eventData.added = added
  if (removed.length) delta.eventData.removed = removed
  if (changed.length) delta.eventData.changed = changed

  // Include lockedSections only if changed
  if (JSON.stringify(oldState?.lockedSections) !== JSON.stringify(newState?.lockedSections)) {
    delta.lockedSections = newState?.lockedSections
  }

  // Include classroomOverrides only if changed
  if (JSON.stringify(oldState?.classroomOverrides) !== JSON.stringify(newState?.classroomOverrides)) {
    delta.classroomOverrides = newState?.classroomOverrides
  }

  console.log(`[delta] ${totalNew} events → delta ${totalDelta} (added ${added.length}, removed ${removed.length}, changed ${changed.length})`)
  return delta
}

function broadcastState (io, proyectionId, trimestre, version, state, delta) {
  const room = `schedule:${proyectionId}:${trimestre}`
  const payload = { proyectionId, trimestre, version, state }
  if (delta) {
    payload.delta = delta
    console.log(`[broadcastState] emitting delta to room ${room} (v${version}), lockedSections keys: ${JSON.stringify(Object.keys(state?.lockedSections || {}))}`)
  } else {
    console.log(`[broadcastState] emitting to room ${room} (v${version}), lockedSections keys: ${JSON.stringify(Object.keys(state?.lockedSections || {}))}`)
  }
  io.to(room).emit('schedule:state', payload)
}

/**
 * Recalculate a single trimestre for a projection.
 * Can be called with a pre-loaded `context` (avoids DB round-trips) or
 * without one (loads everything fresh).
 *
 * @param {string} proyectionId
 * @param {import('socket.io').Server} io
 * @param {'q1'|'q2'|'q3'} trimestre
 * @param {RecalcContext|null} [context] — optional pre-loaded context
 * @param {number} [maxRetries] — how many times to retry on VERSION_CONFLICT (default 3)
 * @returns {Promise<void>}
 */
export async function recalcSingleTrimestre (proyectionId, io, trimestre, context, maxRetries = 3) {
  if (!proyectionId || !io || !TRIMESTRES.includes(trimestre)) return

  let ctx = context
  if (!ctx) {
    ctx = await getRecalcContext(proyectionId)
    if (!ctx) return
  }

  const config = {
    conserveSlots: ctx.scheduleConfig.conserve_slots ?? 3,
    minConsecutiveSlots: ctx.scheduleConfig.min_consecutive_slots ?? 2,
    customDays: ctx.scheduleConfig.days || [1, 2, 3, 4, 5],
    customTurnos: ctx.scheduleConfig.turnos || {},
    distributeEquitably: ctx.scheduleConfig.distribute_equitably || false,
    preventSingleHourBlocks: ctx.scheduleConfig.prevent_single_hour_blocks || false,
    breaks: ctx.scheduleConfig.breaks || []
  }

  let retries = 0
  while (retries <= maxRetries) {
    try {
      const { version: currentVersion, state: oldState } = await getState(proyectionId, trimestre)
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: currentVersion,
        mutator: async () => {
          // Validate locked sections (no mutations - frozen sections are immutable)
          let localLockedSections = ctx.lockedSections
          const healed = selfHealLockedSections(localLockedSections, ctx.subjects, trimestre)
          localLockedSections = healed.lockedSections
          if (healed.warnings.length > 0) {
            console.warn('[scheduleService] Frozen section validation warnings:', healed.warnings)
            // TODO: Broadcast warnings to client for user visibility
          }

          // Flat locked events for this trimestre
          const lockedEventsActiveTrim = []
          for (const [key, events] of Object.entries(localLockedSections)) {
            if (!key.endsWith(`-${trimestre}`)) continue
            lockedEventsActiveTrim.push(...events)
          }

          // Cross-quarter ghosts
          let crossGhosts = []
          try {
            const allLockedEvents = []
            for (const events of Object.values(localLockedSections)) allLockedEvents.push(...events)
            crossGhosts = buildCrossQuarterGhostEvents({
              activeTrimestre: trimestre,
              allEvents: allLockedEvents,
              lockedSectionsFlat: Object.entries(localLockedSections).map(([key, events]) => ({ key, events })),
              eventDataCurrent: [],
              subjects: ctx.subjects
            }) || []
          } catch (e) {
            console.warn('[scheduleService] crossQuarterGhost failed for', trimestre, e)
          }

          // Initial generation
          const initialErrors = []
          const generated = generateScheduleEvents({
            subjects: ctx.subjects,
            classrooms: ctx.classrooms,
            trimestre,
            unavailableDays: ctx.unavailableDays,
            preferredClassrooms: ctx.preferredClassrooms,
            classroomOverrides: ctx.classroomOverrides,
            conserveSlots: config.conserveSlots,
            minConsecutiveSlots: config.minConsecutiveSlots,
            customDays: config.customDays,
            customTurnos: config.customTurnos,
            distributeEquitably: config.distributeEquitably,
            teachers: ctx.teachers,
            preventSingleHourBlocks: config.preventSingleHourBlocks,
            breaks: config.breaks,
            lockedEvents: [...lockedEventsActiveTrim, ...crossGhosts],
            setErrors: (e) => initialErrors.push(e)
          })

          // Auto-solve
          const solved = runAutoSolve({
            eventsdata: generated,
            initialErrors,
            loadedScheduleEvents: [],
            crossQuarterGhostEvents: crossGhosts,
            currentSubjects: ctx.subjects,
            activeTurnos: config.customTurnos,
            scheduleConfig: ctx.scheduleConfig,
            teacherRestrictions: ctx.unavailableDays,
            subjectRestriction: ctx.preferredClassrooms,
            classrooms: ctx.classrooms,
            consecutiveConfig: {
              minSlots: config.minConsecutiveSlots,
              maxSlots: config.conserveSlots
            },
            trimestre,
            lockedSections: localLockedSections
          })

          // Phantom cleanup + frozen enforcement
          let finalEvents = removePhantomEvents(solved.eventsdata)
          // Tripwire: detect any unexpected mutations to locked sections
          const hashBefore = computeLockedSectionsHash(localLockedSections)
          finalEvents = enforceFrozenSections(finalEvents, localLockedSections, trimestre)
          const hashAfter = computeLockedSectionsHash(localLockedSections)
          if (hashBefore !== hashAfter) {
            throw new Error(
              '[scheduleService] FROZEN SECTION MUTATION DETECTED! ' +
              'Locked sections hash changed during recalc for trimestre ' + trimestre + '. ' +
              'This violates the invariant that frozen sections are immutable. ' +
              'Hash before: ' + hashBefore + ', Hash after: ' + hashAfter
            )
          }

          return {
            eventData: finalEvents,
            stagedEvents: [],
            classroomOverrides: ctx.classroomOverrides,
            lockedSections: localLockedSections,
            scheduleConfig: ctx.scheduleConfig,
            lastGenerationErrors: solved.errors
          }
        }
      })

      let delta = null
      try {
        delta = computeStateDelta(oldState, result.state)
      } catch (e) {
        console.warn('[scheduleService] delta computation failed, sending full state:', e.message)
      }
      broadcastState(io, proyectionId, trimestre, result.version, result.state, delta)
      console.log(`[scheduleService] ${trimestre} recalculated (v${result.version}), eventData: ${result.state.eventData?.length} events`)
      return
    } catch (err) {
      if (err.code === 'VERSION_CONFLICT') {
        retries++
        if (retries <= maxRetries) {
          console.warn(`[scheduleService] ${trimestre} version conflict, retry ${retries}/${maxRetries}`)
          // Small exponential backoff to let the competing transaction finish
          await new Promise(r => setTimeout(r, 50 * Math.pow(2, retries)))
          continue
        }
        console.warn(`[scheduleService] ${trimestre} version conflict, exhausted retries`)
        return
      }
      console.error(`[scheduleService] ${trimestre} failed:`, err.message)
      return
    }
  }
}

/**
 * Recalculate the schedule for all three trimestres of a projection.
 * Called automatically when subjects, restrictions, or config change.
 *
 * @param {string} proyectionId
 * @param {import('socket.io').Server} io
 * @returns {Promise<void>}
 */
export async function recalcSchedulesForProyection (proyectionId, io) {
  if (!proyectionId || !io) return

  const context = await getRecalcContext(proyectionId)
  if (!context) return

  for (const trimestre of TRIMESTRES) {
    await recalcSingleTrimestre(proyectionId, io, trimestre, context)
  }
}
