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
  enforceFrozenSections
} from './engine/index.js'
import {
  loadTeacherRestrictions,
  loadSubjectRestrictions,
  loadClassroomOverrides,
  loadLockedSections
} from './loadRestrictions.js'

const TRIMESTRES = ['q1', 'q2', 'q3']

function roomName (proyectionId, trimestre) {
  return `schedule:${proyectionId}:${trimestre}`
}

function broadcastState (io, proyectionId, trimestre, version, state) {
  const room = `schedule:${proyectionId}:${trimestre}`
  console.log(`[broadcastState] emitting to room ${room} (v${version}), lockedSections keys: ${JSON.stringify(Object.keys(state?.lockedSections || {}))}`)
  io.to(room).emit('schedule:state', {
    proyectionId,
    trimestre,
    version,
    state
  })
}

/**
 * Shared context loaded once per projection. Passed to `recalcSingleTrimestre`
 * so that multi-trimestre recalcs don't hit the DB three times.
 *
 * @typedef {Object} RecalcContext
 * @property {any[]} subjects
 * @property {any[]} classrooms
 * @property {any[]} teachers
 * @property {any} scheduleConfig
 * @property {any[]} unavailableDays
 * @property {any[]} preferredClassrooms
 * @property {any[]} classroomOverrides
 * @property {Record<string,any[]>} lockedSections
 */

/**
 * Load the shared recalc context for a projection.
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
    ctx = await loadRecalcContext(proyectionId)
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
      const { version: currentVersion } = await getState(proyectionId, trimestre)
      const result = await applyAction({
        proyectionId,
        trimestre,
        baseVersion: currentVersion,
        mutator: async () => {
          // Self-heal locked sections
          let localLockedSections = ctx.lockedSections
          const healed = selfHealLockedSections(localLockedSections, ctx.subjects, trimestre)
          localLockedSections = healed.lockedSections

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
          finalEvents = enforceFrozenSections(finalEvents, localLockedSections, trimestre)

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

      broadcastState(io, proyectionId, trimestre, result.version, result.state)
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

  const context = await loadRecalcContext(proyectionId)
  if (!context) return

  for (const trimestre of TRIMESTRES) {
    await recalcSingleTrimestre(proyectionId, io, trimestre, context)
  }
}
