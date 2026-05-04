// =====================================================
// CSP solver with backtracking.
// Ported verbatim from fucntions.tsx (solveAll, assignTask,
// tryPlaceDecomposition, tryProfessorBacktrack).
//
// NOTE ON MUTABLE STATE:
//   The original frontend used a module-level `backtrackCounter` that was
//   reset at various points. We preserve that semantics here. Generation is
//   CPU-bound and synchronous, so as long as `generateScheduleEvents` is not
//   invoked concurrently on the same Node event-loop turn the counter stays
//   coherent. The state service must serialise generation per
//   (proyection, trimestre) to honour this assumption.
// =====================================================

import { MAX_BACKTRACKS } from './constants.js'
import { generateDecompositions } from './decompositions.js'
import { findSlotPlacements, applyBlock, undoBlock } from './placement.js'

/** @type {{ value: number }} Module-level backtrack counter holder. */
export const counter = { value: 0 }

/** Reset the backtrack counter. */
export function resetCounter () { counter.value = 0 }

/**
 * Try to place the blocks of a decomposition using recursive backtracking.
 * @param {number[]} decomp
 * @param {number} blockIdx
 * @param {import('./types.js').BlockPlacement[]} placed
 * @param {import('./types.js').SubjectTask} task
 * @param {import('./occupancyTracker.js').OccupancyTracker} occupancy
 * @returns {import('./types.js').BlockPlacement[] | null}
 */
export function tryPlaceDecomposition (decomp, blockIdx, placed, task, occupancy) {
  if (counter.value >= MAX_BACKTRACKS) return null
  if (blockIdx >= decomp.length) return [...placed]

  const blockLen = decomp[blockIdx]
  /** @type {Map<number, import('./types.js').BlockPlacement[]>} */
  const usedDays = new Map()
  for (const bp of placed) {
    if (!usedDays.has(bp.day)) usedDays.set(bp.day, [])
    usedDays.get(bp.day).push(bp)
  }

  const sortedDays = [...task.availableDays].sort((a, b) => {
    const aUsed = usedDays.has(a) ? 1 : 0
    const bUsed = usedDays.has(b) ? 1 : 0
    if (aUsed !== bUsed) return aUsed - bUsed
    const aHours = occupancy.getSubjectDayHours(task.subject.innerId, a)
    const bHours = occupancy.getSubjectDayHours(task.subject.innerId, b)
    return aHours - bHours
  })

  for (const day of sortedDays) {
    // REGLA DE HIERRO 1: conserveSlots is absolute.
    const currentHours = occupancy.getSubjectDayHours(task.subject.innerId, day)
    const maxAllowedOnDay = task.effectiveConserveSlots
    if (currentHours + blockLen > maxAllowedOnDay) continue

    // REGLA DE HIERRO 2: a subject cannot appear in non-consecutive blocks in the same day.
    const allSlotOptions = findSlotPlacements(day, blockLen, task, occupancy)
    const existingStartTimes = occupancy.getSubjectDayStartTimes(task.subject.innerId, day)

    let slotOptions = allSlotOptions

    if (existingStartTimes.length > 0) {
      const existingIndices = []
      for (const t of existingStartTimes) {
        const idx = task.timeSlots.findIndex(s => s[0] === t)
        if (idx >= 0) existingIndices.push(idx)
      }

      if (existingIndices.length > 0) {
        existingIndices.sort((a, b) => a - b)
        const existingMin = existingIndices[0]
        const existingMaxEnd = existingIndices[existingIndices.length - 1] + 1

        slotOptions = allSlotOptions.filter(option => {
          const newEnd = option.startSlotIndex + option.length
          return newEnd === existingMin || option.startSlotIndex === existingMaxEnd
        })
      }
    }

    for (const option of slotOptions) {
      /** @type {import('./types.js').BlockPlacement} */
      const bp = { day, ...option }
      applyBlock(bp, task, occupancy)
      placed.push(bp)

      const result = tryPlaceDecomposition(decomp, blockIdx + 1, placed, task, occupancy)
      if (result) return result

      placed.pop()
      undoBlock(bp, task, occupancy)
      counter.value++
      if (counter.value >= MAX_BACKTRACKS) return null
    }
  }

  return null
}

/**
 * Try to assign a subject across every valid decomposition.
 * @param {import('./types.js').SubjectTask} task
 * @param {import('./occupancyTracker.js').OccupancyTracker} occupancy
 * @param {boolean} [distributeEquitably=false]
 * @returns {import('./types.js').BlockPlacement[] | null}
 */
export function assignTask (task, occupancy, distributeEquitably = false) {
  const minBlock = task.preventSingleHourBlocks ? 2 : 1
  const theoreticalMaxBlocks = Math.ceil(task.totalHours / minBlock)
  const maxBlocks = Math.max(task.availableDays.length, theoreticalMaxBlocks)

  const decomps = generateDecompositions(
    task.totalHours,
    task.effectiveConserveSlots,
    task.effectiveMinConsecutive,
    maxBlocks,
    distributeEquitably,
    task.preventSingleHourBlocks
  )

  for (const decomp of decomps) {
    const result = tryPlaceDecomposition(decomp, 0, [], task, occupancy)
    if (result) return result
  }

  return null
}

/**
 * Professor-targeted backtracking: when a subject can't fit, undo ALL of its
 * teacher's prior assignments, try to place the failing subject first, then
 * re-assign the teacher's other subjects.
 * @param {number} currentIdx
 * @param {import('./types.js').SubjectTask} task
 * @param {import('./types.js').SubjectTask[]} tasks
 * @param {Map<number, import('./types.js').BlockPlacement[]>} assigned
 * @param {number[]} assignmentOrder
 * @param {import('./occupancyTracker.js').OccupancyTracker} occupancy
 * @param {boolean} distributeEquitably
 * @returns {boolean}
 */
export function tryProfessorBacktrack (
  currentIdx,
  task,
  tasks,
  assigned,
  assignmentOrder,
  occupancy,
  distributeEquitably
) {
  const sameProfIndices = assignmentOrder.filter(
    (idx) => tasks[idx].professorId === task.professorId
  )
  if (sameProfIndices.length === 0) return false

  const savedPlacements = new Map()
  for (const idx of sameProfIndices) {
    savedPlacements.set(idx, assigned.get(idx))
    for (const bp of assigned.get(idx)) {
      undoBlock(bp, tasks[idx], occupancy)
    }
    assigned.delete(idx)
  }

  const sameProfSet = new Set(sameProfIndices)
  counter.value = 0

  const currentPlacements = assignTask(task, occupancy, distributeEquitably)

  if (currentPlacements) {
    assigned.set(currentIdx, currentPlacements)
    let allReassigned = true
    const reassignedIndices = []

    const sortedSameProf = [...sameProfIndices].sort(
      (a, b) => tasks[b].constraintScore - tasks[a].constraintScore
    )

    for (const idx of sortedSameProf) {
      counter.value = 0
      const retry = assignTask(tasks[idx], occupancy, distributeEquitably)
      if (retry) {
        assigned.set(idx, retry)
        reassignedIndices.push(idx)
      } else {
        allReassigned = false
        break
      }
    }

    if (allReassigned) {
      const filtered = assignmentOrder.filter((idx) => !sameProfSet.has(idx))
      assignmentOrder.length = 0
      assignmentOrder.push(...filtered, ...sortedSameProf, currentIdx)
      return true
    }

    for (const bp of currentPlacements) undoBlock(bp, task, occupancy)
    assigned.delete(currentIdx)

    for (const idx of reassignedIndices) {
      for (const bp of assigned.get(idx)) undoBlock(bp, tasks[idx], occupancy)
      assigned.delete(idx)
    }
  }

  for (const [idx, pls] of savedPlacements) {
    for (const bp of pls) applyBlock(bp, tasks[idx], occupancy)
    assigned.set(idx, pls)
  }

  return false
}

/**
 * Main solver with `maxDepth` back-jump and professor-targeted fallback.
 * @param {import('./types.js').SubjectTask[]} tasks
 * @param {import('./occupancyTracker.js').OccupancyTracker} occupancy
 * @param {number} [maxDepth=4]
 * @param {boolean} [distributeEquitably=false]
 * @returns {{ assigned: Map<number, import('./types.js').BlockPlacement[]>, unassigned: number[] }}
 */
export function solveAll (tasks, occupancy, maxDepth = 4, distributeEquitably = false) {
  /** @type {Map<number, import('./types.js').BlockPlacement[]>} */
  const assigned = new Map()
  /** @type {number[]} */
  const assignmentOrder = []
  /** @type {number[]} */
  const unassigned = []

  let i = 0
  while (i < tasks.length) {
    counter.value = 0

    const task = tasks[i]
    const placements = assignTask(task, occupancy, distributeEquitably)

    if (placements) {
      assigned.set(i, placements)
      assignmentOrder.push(i)
      i++
    } else {
      let resolved = false
      let depth = 0

      while (depth < maxDepth && assignmentOrder.length > 0 && counter.value < MAX_BACKTRACKS) {
        depth++
        const prevIdx = assignmentOrder.pop()
        const prevPlacements = assigned.get(prevIdx)
        const prevTask = tasks[prevIdx]

        for (const bp of prevPlacements) undoBlock(bp, prevTask, occupancy)
        assigned.delete(prevIdx)

        const currentPlacements = assignTask(task, occupancy, distributeEquitably)
        if (currentPlacements) {
          assigned.set(i, currentPlacements)

          const prevRetry = assignTask(prevTask, occupancy, distributeEquitably)
          if (prevRetry) {
            assigned.set(prevIdx, prevRetry)
            assignmentOrder.push(prevIdx)
            assignmentOrder.push(i)
            resolved = true
            i++
            break
          } else {
            for (const bp of currentPlacements) undoBlock(bp, task, occupancy)
            assigned.delete(i)

            for (const bp of prevPlacements) applyBlock(bp, prevTask, occupancy)
            assigned.set(prevIdx, prevPlacements)
            assignmentOrder.push(prevIdx)
          }
        } else {
          for (const bp of prevPlacements) applyBlock(bp, prevTask, occupancy)
          assigned.set(prevIdx, prevPlacements)
          assignmentOrder.push(prevIdx)
        }

        counter.value++
      }

      if (!resolved) {
        counter.value = 0
        resolved = tryProfessorBacktrack(
          i,
          task,
          tasks,
          assigned,
          assignmentOrder,
          occupancy,
          distributeEquitably
        )
        if (resolved) i++
      }

      if (!resolved) {
        unassigned.push(i)
        i++
      }
    }
  }

  return { assigned, unassigned }
}
