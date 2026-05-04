// =====================================================
// Public API of the schedule engine.
// Consumers should import only from this file.
// =====================================================

export { generateScheduleEvents, mergeConsecutiveEvents } from './generator.js'
export { turnos, MAX_BACKTRACKS } from './constants.js'
export { OccupancyTracker } from './occupancyTracker.js'
export { normalizeText } from './normalizeText.js'
export {
  buildCrossQuarterGhostEvents,
  doesEventConflictWithGhost,
  getPrimaryQuarter,
  getSubjectPeriod,
  periodsOverlap,
  stripGhostFlags
} from './crossQuarterGhost.js'
