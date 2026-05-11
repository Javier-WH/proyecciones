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
 * Recalculate the schedule for all three trimestres of a projection.
 * Called automatically when subjects, restrictions, or config change.
 *
 * @param {string} proyectionId
 * @param {import('socket.io').Server} io
 * @returns {Promise<void>}
 */
export async function recalcSchedulesForProyection (proyectionId, io) {
  if (!proyectionId || !io) return

  try {
    // Load all data from DB
    const proyection = await Proyections.findOne({ where: { id: proyectionId }, raw: true })
    if (!proyection) { console.warn('[scheduleService] proyection not found:', proyectionId); return }

    const subjects = JSON.parse(proyection.subjects || '[]')
    if (subjects.length === 0) { console.warn('[scheduleService] no subjects in proyection'); return }

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

    for (const trimestre of TRIMESTRES) {
      try {
        // Read the current version so we pass the correct baseVersion for
        // optimistic locking, rather than hardcoding 0 which causes version
        // conflicts on every subsequent recalc.
        const { version: currentVersion } = await getState(proyectionId, trimestre)
        const result = await applyAction({
          proyectionId,
          trimestre,
          baseVersion: currentVersion,
          mutator: async () => {
            // Self-heal locked sections
            const healed = selfHealLockedSections(lockedSections, subjects, trimestre)
            lockedSections = healed.lockedSections

            // Flat locked events for this trimestre
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
              console.warn('[scheduleService] crossQuarterGhost failed for', trimestre, e)
            }

            // Initial generation
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

            // Auto-solve
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

            // Phantom cleanup + frozen enforcement
            let finalEvents = removePhantomEvents(solved.eventsdata)
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
        console.log(`[scheduleService] ${trimestre} recalculated (v${result.version}), eventData: ${result.state.eventData?.length} events, lockedSections: ${JSON.stringify(Object.keys(result.state.lockedSections || {}))}`)
      } catch (err) {
        if (err.code === 'VERSION_CONFLICT') {
          console.warn(`[scheduleService] ${trimestre} version conflict, skipping`)
        } else {
          console.error(`[scheduleService] ${trimestre} failed:`, err.message)
        }
      }
    }
  } catch (err) {
    console.error('[scheduleService] recalc failed:', err.message)
  }
}
