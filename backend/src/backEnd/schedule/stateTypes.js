// JSDoc typedefs for the authoritative schedule state.

/**
 * @typedef {Object} ScheduleState
 * @property {import('./engine/types.js').ScheduleEvent[]} eventData
 * @property {import('./engine/types.js').ScheduleEvent[]} stagedEvents
 * @property {Record<string, import('./engine/types.js').ScheduleEvent[]>} lockedSections
 * @property {import('./engine/types.js').ClassroomOverride[]} classroomOverrides
 * @property {Object} scheduleConfig
 * @property {Object[]} [lastGenerationErrors]
 */

export {}
