// =====================================================
// Placement finding + apply/undo helpers.
// Ported verbatim from fucntions.tsx.
// =====================================================

/**
 * Find every valid placement of a `blockLen`-slot block on a given day,
 * respecting teacher restrictions, breaks, and occupancy.
 *
 * @param {number} day
 * @param {number} blockLen
 * @param {import('./types.js').SubjectTask} task
 * @param {import('./occupancyTracker.js').OccupancyTracker} occupancy
 * @returns {Omit<import('./types.js').BlockPlacement, 'day'>[]}
 */
export function findSlotPlacements (day, blockLen, task, occupancy) {
  const {
    timeSlots,
    restrictedHours,
    professorId,
    subject,
    candidateClassrooms,
    breaks
  } = task
  /** @type {Omit<import('./types.js').BlockPlacement, 'day'>[]} */
  const placements = []

  for (let startIdx = 0; startIdx <= timeSlots.length - blockLen; startIdx++) {
    let runValid = true
    const slotStarts = []

    for (let offset = 0; offset < blockLen; offset++) {
      const [slotStart] = timeSlots[startIdx + offset]
      slotStarts.push(slotStart)

      if (restrictedHours.some((rh) => rh.day === day && rh.start === slotStart)) {
        runValid = false
        break
      }

      if (offset > 0 && breaks && breaks.length > 0) {
        const prevEnd = timeSlots[startIdx + offset - 1][1]
        const currentStart = slotStart
        if (breaks.some((b) => prevEnd <= b.start && currentStart >= b.end)) {
          runValid = false
          break
        }
      }

      if (occupancy.hasProfConflict(day, slotStart, professorId)) {
        runValid = false
        break
      }
      if (
        occupancy.hasSectionConflict(
          day,
          slotStart,
          subject.pnfId,
          subject.trayectoId,
          subject.seccion
        )
      ) {
        runValid = false
        break
      }
    }
    if (!runValid) continue

    for (const room of candidateClassrooms) {
      let roomOk = true
      for (const s of slotStarts) {
        if (occupancy.hasRoomConflict(day, s, room.id)) {
          roomOk = false
          break
        }
      }
      if (roomOk) {
        placements.push({
          startSlotIndex: startIdx,
          length: blockLen,
          classroomId: room.id,
          classroomName: room.classroom
        })
      }
    }
  }

  return placements
}

/**
 * @param {import('./types.js').BlockPlacement} bp
 * @param {import('./types.js').SubjectTask} task
 * @param {import('./occupancyTracker.js').OccupancyTracker} occ
 */
export function applyBlock (bp, task, occ) {
  for (let i = 0; i < bp.length; i++) {
    const [start] = task.timeSlots[bp.startSlotIndex + i]
    occ.occupy(
      bp.day,
      start,
      task.professorId,
      bp.classroomId,
      task.subject.pnfId,
      task.subject.trayectoId,
      task.subject.seccion,
      task.subject.innerId
    )
  }
}

/**
 * @param {import('./types.js').BlockPlacement} bp
 * @param {import('./types.js').SubjectTask} task
 * @param {import('./occupancyTracker.js').OccupancyTracker} occ
 */
export function undoBlock (bp, task, occ) {
  for (let i = 0; i < bp.length; i++) {
    const [start] = task.timeSlots[bp.startSlotIndex + i]
    occ.release(
      bp.day,
      start,
      task.professorId,
      bp.classroomId,
      task.subject.pnfId,
      task.subject.trayectoId,
      task.subject.seccion,
      task.subject.innerId
    )
  }
}
