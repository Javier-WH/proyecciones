// =====================================================
// Main schedule generator — entry point.
// Ported verbatim from src/components/SchoolSchedule/fucntions.tsx.
// Any algorithmic change MUST be mirrored here and on the frontend copy
// (while the copy exists) to keep parity.
// =====================================================

import { turnos as defaultTurnos } from './constants.js'
import { OccupancyTracker } from './occupancyTracker.js'
import { applyBlock, undoBlock } from './placement.js'
import { assignTask, solveAll, counter as solverCounter } from './solver.js'
import { normalizeText } from './normalizeText.js'

/**
 * CSP-based schedule generator with backtracking.
 *
 * @param {import('./types.js').GenerateScheduleParams} params
 * @returns {import('./types.js').ScheduleEvent[]}
 */
export function generateScheduleEvents (params) {
  const {
    subjects,
    classrooms,
    trimestre,
    unavailableDays,
    preferredClassrooms,
    classroomOverrides,
    conserveSlots = 3,
    minConsecutiveSlots = 2,
    setErrors = (err) => console.log(err),
    customDays,
    customTurnos,
    distributeEquitably = false,
    teachers = [],
    preventSingleHourBlocks = false,
    breaks = [],
    lockedEvents = []
  } = params

  solverCounter.value = 0

  const days = customDays || [1, 2, 3, 4, 5]
  const activeTurnos = customTurnos || defaultTurnos
  const occupancy = new OccupancyTracker()

  // ─── Pre-occupy locked events ───
  if (lockedEvents.length > 0) {
    const reportedLockedErrors = new Set()

    for (const evt of lockedEvents) {
      if (evt.daysOfWeek?.length && evt.startTime && evt.extendedProps) {
        const day = evt.daysOfWeek[0]
        const professorId = evt.extendedProps.professorId
        const turnName = evt.extendedProps.turnName?.toLowerCase() || ''
        const timeSlots = activeTurnos[turnName] || []
        const isGhost = !!evt.extendedProps.isCrossQuarterGhost

        const startIdx = timeSlots.findIndex(s => s[0] === evt.startTime)
        const endIdx = timeSlots.findIndex(s => s[1] === evt.endTime)

        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            if (isGhost) {
              occupancy.occupyGhost(day, timeSlots[i][0], professorId, evt.extendedProps.classroomId)
            } else {
              occupancy.occupy(
                day,
                timeSlots[i][0],
                professorId,
                evt.extendedProps.classroomId,
                evt.extendedProps.pnfId,
                evt.extendedProps.trayectoId,
                evt.extendedProps.seccion,
                evt.extendedProps.subjectId
              )
            }
          }
        } else {
          if (isGhost) {
            occupancy.occupyGhost(day, evt.startTime, professorId, evt.extendedProps.classroomId)
          } else {
            occupancy.occupy(
              day,
              evt.startTime,
              professorId,
              evt.extendedProps.classroomId,
              evt.extendedProps.pnfId,
              evt.extendedProps.trayectoId,
              evt.extendedProps.seccion,
              evt.extendedProps.subjectId
            )
          }
        }

        if (evt.extendedProps.isCrossQuarterGhost) continue

        const teacherObj = teachers?.find((t) => t.id === professorId)
        const professorName = teacherObj
          ? `${teacherObj.name} ${teacherObj.lastName}`
          : professorId

        const baseErrKey = `${evt.extendedProps.subjectId}-${evt.extendedProps.seccion}-${evt.extendedProps.trayectoId}`

        // Validate exclusive classroom restrictions for frozen sections
        const subjectNorm = normalizeText(evt.title)
        const trayectoNorm = normalizeText(evt.extendedProps.trayectoName || '')
        const subjectKey = `${subjectNorm}_t_${trayectoNorm}`

        const preferConfig =
          preferredClassrooms?.find(
            (p) => p.subjectKey === subjectKey && p.pnfId === evt.extendedProps.pnfId
          ) ??
          preferredClassrooms?.find(
            (p) => p.subjectKey === subjectKey && !p.pnfId
          )

        if (preferConfig && preferConfig.isExclusive && !preferConfig.splitHours && preferConfig.classroomIds?.length) {
          const stringifiedClassroomIds = preferConfig.classroomIds.map(String)
          if (!stringifiedClassroomIds.includes(String(evt.extendedProps.classroomId))) {
            const errKey = `${baseErrKey}-room`
            if (!reportedLockedErrors.has(errKey)) {
              reportedLockedErrors.add(errKey)
              const classObj = classrooms?.find(c => stringifiedClassroomIds.includes(String(c.id)))
              setErrors({
                name: evt.title,
                description: `[SECCIÓN CONGELADA] Conflicto de Aula: Esta materia exige un aula exclusiva (ej. ${classObj?.classroom || 'Otra'}), pero está fijada en otra distinta. Descongele la sección.`,
                seccion: evt.extendedProps.seccion,
                year: evt.extendedProps.trayectoName || '',
                turn: evt.extendedProps.turnName || '',
                pnfName: evt.extendedProps.pnfName || '',
                professorName: professorName || undefined,
                trimestre
              })
            }
          }
        }
      }
    }
  }

  // ─── Build set of reserved classrooms ───
  const reservedClassroomIds = new Set()
  if (preferredClassrooms) {
    for (const pref of preferredClassrooms) {
      if (pref.classroomIds?.length) {
        for (const id of pref.classroomIds) reservedClassroomIds.add(id)
      }
    }
  }

  // ─── Step 2: filter subjects and build tasks ───
  const filteredSubjects = subjects.filter((sub) => {
    const isQuarterMatch =
      Object.keys(sub.quarter).includes(trimestre) &&
      sub?.hours?.[trimestre] &&
      sub.hours[trimestre] > 0
    return !!isQuarterMatch
  })

  // ─── Exclude linked subjects ───
  // Linked sections (linkedToSection) must NOT appear in the schedule: they are
  // neither scheduled independently nor cloned from a main section.
  const nonLinkedSubjects = filteredSubjects.filter(sub => !sub.linkedToSection)

  /** @type {import('./types.js').SubjectTask[]} */
  const tasks = nonLinkedSubjects.flatMap((sub) => {
    const professorId = sub.quarter[trimestre]
    const turnoName = sub.turnoName?.toLowerCase() || ''
    const subjectNorm = normalizeText(sub.subject)
    const trayectoNorm = normalizeText(sub.trayectoName || '')
    const subjectKey = `${subjectNorm}_t_${trayectoNorm}`
    const originalTotalHours = sub.hours[trimestre]

    // Ghost events do NOT deduct hours.
    const placedHours = lockedEvents.filter(
      e => e.extendedProps?.subjectId === sub.innerId && !e.extendedProps?.isCrossQuarterGhost
    ).length
    const totalHours = originalTotalHours - placedHours

    if (totalHours <= 0) return []
    if (!professorId) {
      setErrors({
        name: sub.subject,
        description: `No se pudo asignar: faltan ${originalTotalHours} de ${originalTotalHours} horas. Esta materia no tiene profesor asignado para el trimestre. Para solucionarlo: asigne un profesor desde la sección de Proyección.`,
        seccion: sub.seccion,
        year: sub.trayectoName,
        turn: sub.turnoName,
        pnfName: sub.pnf || '',
        professorName: 'Sin Profesor Asignado',
        trimestre,
        subjectId: sub.innerId,
        trayectoId: sub.trayectoId,
        pnfId: sub.pnfId,
        totalHours: originalTotalHours
      })
      return []
    }

    const timeSlots = activeTurnos[turnoName]
    if (!timeSlots || timeSlots.length === 0) {
      const teacherObj = teachers?.find((t) => t.id === professorId)
      const professorName = teacherObj
        ? `${teacherObj.name} ${teacherObj.lastName}`
        : professorId
      setErrors({
        name: sub.subject,
        description: `No se pudo asignar: faltan ${totalHours} de ${originalTotalHours} horas. El turno "${sub.turnoName || '(sin turno)'}" no tiene franjas horarias configuradas. Para solucionarlo: configure las franjas horarias del turno en Configuración (⚙️).`,
        seccion: sub.seccion,
        year: sub.trayectoName,
        turn: sub.turnoName,
        pnfName: sub.pnf || '',
        professorName,
        trimestre,
        subjectId: sub.innerId,
        professorId,
        trayectoId: sub.trayectoId,
        pnfId: sub.pnfId,
        totalHours
      })
      return []
    }

    if (preventSingleHourBlocks && originalTotalHours === 1) {
      const teacherObj = teachers?.find((t) => t.id === professorId)
      const professorName = teacherObj
        ? `${teacherObj.name} ${teacherObj.lastName}`
        : professorId
      setErrors({
        name: sub.subject,
        description: 'Esta materia solo tiene 1 hora asignada en el trimestre, pero está activada la opción "Evitar bloques de 1 sola hora". Para solucionarlo: desactive esa opción en la Configuración (⚙️), o aumente las horas de esta materia a 2 o más.',
        seccion: sub.seccion,
        year: sub.trayectoName,
        turn: sub.turnoName,
        pnfName: sub.pnf || '',
        professorName,
        trimestre
      })
      return []
    }

    const teacherRest = unavailableDays?.find(
      (r) => String(r.teacherId) === String(professorId)
    )
    const restrictedDays = teacherRest?.days?.map(String) ?? []
    const restrictedHours = teacherRest?.hours ?? []
    const availableDays = days.filter((d) => !restrictedDays.includes(String(d)))

    const preferConfig =
      preferredClassrooms?.find((p) => p.subjectKey === subjectKey && p.pnfId === sub.pnfId) ??
      preferredClassrooms?.find((p) => p.subjectKey === subjectKey && !p.pnfId)

    const candidateClassrooms = preferConfig?.classroomIds?.length
      ? (preferConfig.isExclusive
          ? classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
          : classrooms.filter((c) => preferConfig.classroomIds.includes(c.id) || !c.exclusive).sort((a, b) => {
            const aInPref = preferConfig.classroomIds.includes(a.id)
            const bInPref = preferConfig.classroomIds.includes(b.id)
            if (aInPref && !bInPref) return -1
            if (!aInPref && bInPref) return 1
            const aReserved = reservedClassroomIds.has(a.id) ? 1 : 0
            const bReserved = reservedClassroomIds.has(b.id) ? 1 : 0
            return aReserved - bReserved
          })
        )
      : classrooms.filter((c) => !c.exclusive).sort((a, b) => {
        const aReserved = reservedClassroomIds.has(a.id) ? 1 : 0
        const bReserved = reservedClassroomIds.has(b.id) ? 1 : 0
        return aReserved - bReserved
      })

    if (candidateClassrooms.length === 0 || availableDays.length === 0) {
      const teacherObj = teachers?.find((t) => t.id === professorId)
      const professorName = teacherObj
        ? `${teacherObj.name} ${teacherObj.lastName}`
        : professorId

      const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      const restrictedDayNames = restrictedDays.map((d) => dayNames[Number(d)] || `Día ${d}`).join(', ')

      let errorDesc = ''
      if (availableDays.length === 0) {
        errorDesc = `El profesor tiene restringidos todos los días hábiles (${restrictedDayNames}), por lo que no hay ningún día disponible para asignar esta materia. Para solucionarlo: edite las restricciones del profesor y habilite al menos un día.`
      } else {
        errorDesc = preferConfig
          ? 'Las aulas asignadas como preferidas para esta materia no están disponibles o no existen. Para solucionarlo: revise las restricciones de aulas de esta materia y seleccione aulas válidas.'
          : 'No hay aulas disponibles para asignar esta materia. Para solucionarlo: agregue más aulas en el sistema.'
      }

      setErrors({
        name: sub.subject,
        description: errorDesc,
        seccion: sub.seccion,
        year: sub.trayectoName,
        turn: sub.turnoName,
        pnfName: sub.pnf || '',
        professorName,
        trimestre
      })
      return []
    }

    // Constraint score (MRV)
    let score = 0
    const dayRestrictionScore = availableDays.length > 0
      ? Math.round(1000 / availableDays.length)
      : 2000
    score += dayRestrictionScore
    score += restrictedHours.length * 50
    if (availableDays.length > 0) {
      const hoursPerAvailableDay = sub.hours[trimestre] / availableDays.length
      score += Math.round(hoursPerAvailableDay * 100)
    }
    if (candidateClassrooms.length <= 3) {
      score += Math.round(200 / candidateClassrooms.length)
    } else {
      score += Math.max(0, 20 - candidateClassrooms.length) * 5
    }
    score += sub.hours[trimestre] * 3
    score += Math.max(0, 15 - timeSlots.length) * 100

    const hasTeacherRestrictions = restrictedDays.length > 0 || restrictedHours.length > 0
    const hasClassroomRestrictions = !!(preferConfig?.classroomIds?.length)

    // Classroom overrides: forced tasks
    const subjectOverrides = classroomOverrides?.filter(
      (ov) =>
        sub.subject === ov.subject_name &&
        (!ov.seccion || sub.seccion === ov.seccion) &&
        (!ov.pnf_id || sub.pnfId === ov.pnf_id) &&
        (!ov.trayecto_id || sub.trayectoId === ov.trayecto_id)
    ) || []

    let remainingHours = totalHours
    /** @type {import('./types.js').SubjectTask[]} */
    const results = []

    for (const ov of subjectOverrides) {
      const startIndex = timeSlots.findIndex(t => t[0] === ov.start_time)
      const endIndex = timeSlots.findIndex(t => t[1] === ov.end_time)
      if (startIndex === -1 || endIndex === -1) continue
      const length = endIndex - startIndex + 1
      remainingHours -= length

      results.push({
        subject: sub,
        totalHours: length,
        professorId,
        turnoName,
        timeSlots: timeSlots.slice(startIndex, endIndex + 1),
        availableDays: [ov.day],
        restrictedHours: [],
        candidateClassrooms: classrooms.filter(c => c.id === ov.classroom_id),
        effectiveConserveSlots: length,
        effectiveMinConsecutive: length,
        preferLastSlot: false,
        constraintScore: score + 10000,
        preventSingleHourBlocks: false,
        hasTeacherRestrictions: true,
        hasClassroomRestrictions: true,
        isClassroomExclusive: true
      })
    }

    if (remainingHours <= 0) return results

    // splitHours: split subject into preferred-room task + any-room task
    if (preferConfig?.splitHours && preferConfig.classroomIds?.length && remainingHours >= 2) {
      const preferredHours = Math.ceil(remainingHours / 2)
      const otherHours = remainingHours - preferredHours

      const preferredRooms = classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
      const nonExclusiveRooms = classrooms.filter((c) => !c.exclusive && !preferConfig.classroomIds.includes(c.id)).sort((a, b) => {
        const aReserved = reservedClassroomIds.has(a.id) ? 1 : 0
        const bReserved = reservedClassroomIds.has(b.id) ? 1 : 0
        return aReserved - bReserved
      })

      const baseSlotsConfig = preferConfig?.preferLastSlot ? [...timeSlots].reverse() : timeSlots

      if (preferredRooms.length > 0 && preferredHours > 0) {
        results.push({
          subject: sub,
          totalHours: preferredHours,
          professorId,
          turnoName,
          timeSlots: baseSlotsConfig,
          availableDays,
          restrictedHours,
          candidateClassrooms: preferredRooms,
          effectiveConserveSlots: conserveSlots,
          effectiveMinConsecutive: Math.min(minConsecutiveSlots, preferredHours),
          preferLastSlot: preferConfig?.preferLastSlot || false,
          constraintScore: score + 100,
          preventSingleHourBlocks,
          hasTeacherRestrictions,
          hasClassroomRestrictions: true,
          isClassroomExclusive: true,
          breaks
        })
      }

      if (nonExclusiveRooms.length > 0 && otherHours > 0) {
        results.push({
          subject: sub,
          totalHours: otherHours,
          professorId,
          turnoName,
          timeSlots: baseSlotsConfig,
          availableDays,
          restrictedHours,
          candidateClassrooms: nonExclusiveRooms,
          effectiveConserveSlots: conserveSlots,
          effectiveMinConsecutive: Math.min(minConsecutiveSlots, otherHours),
          preferLastSlot: preferConfig?.preferLastSlot || false,
          constraintScore: score + 50,
          preventSingleHourBlocks: preventSingleHourBlocks && otherHours >= 2,
          hasTeacherRestrictions,
          hasClassroomRestrictions: false,
          isClassroomExclusive: false,
          breaks
        })
      }

      return results.length > 0 ? results : []
    }

    results.push({
      subject: sub,
      totalHours: remainingHours,
      professorId,
      turnoName,
      timeSlots: preferConfig?.preferLastSlot ? [...timeSlots].reverse() : timeSlots,
      availableDays,
      restrictedHours,
      candidateClassrooms,
      effectiveConserveSlots: conserveSlots,
      effectiveMinConsecutive: Math.min(minConsecutiveSlots, remainingHours),
      preferLastSlot: preferConfig?.preferLastSlot || false,
      constraintScore: score,
      preventSingleHourBlocks: preventSingleHourBlocks && remainingHours >= 2,
      hasTeacherRestrictions,
      hasClassroomRestrictions,
      isClassroomExclusive: !!(preferConfig?.classroomIds?.length && preferConfig.isExclusive),
      breaks
    })

    return results
  })

  // ─── Step 3: sort tasks by restriction priority ───
  tasks.sort((a, b) => {
    if (a.isClassroomExclusive !== b.isClassroomExclusive) {
      return a.isClassroomExclusive ? -1 : 1
    }
    const aHasRestrictions = a.hasTeacherRestrictions || a.hasClassroomRestrictions
    const bHasRestrictions = b.hasTeacherRestrictions || b.hasClassroomRestrictions
    if (aHasRestrictions !== bHasRestrictions) return aHasRestrictions ? -1 : 1
    if (aHasRestrictions && bHasRestrictions) {
      const aBoth = (a.hasTeacherRestrictions && a.hasClassroomRestrictions) ? 1 : 0
      const bBoth = (b.hasTeacherRestrictions && b.hasClassroomRestrictions) ? 1 : 0
      if (aBoth !== bBoth) return bBoth - aBoth
    }
    const mrvRatio = (t) => {
      const totalSlots = Math.max(1, t.availableDays.length * t.timeSlots.length - t.restrictedHours.length)
      return t.totalHours / totalSlots
    }
    const aRatio = mrvRatio(a)
    const bRatio = mrvRatio(b)
    if (Math.abs(aRatio - bRatio) > 0.05) return bRatio - aRatio
    if (a.constraintScore !== b.constraintScore) return b.constraintScore - a.constraintScore
    if (a.professorId !== b.professorId) return a.professorId.localeCompare(b.professorId)
    return (a.subject.innerId || '').localeCompare(b.subject.innerId || '')
  })

  // ─── Step 4: initial solve ───
  let { assigned, unassigned } = solveAll(tasks, occupancy, 10, distributeEquitably)

  // ─── Step 4b: re-solve with failed subjects prioritized ───
  if (unassigned.length > 0) {
    const prevAssigned = new Map(assigned)
    const prevUnassignedCount = unassigned.length

    for (const [idx, placements] of prevAssigned.entries()) {
      for (const bp of placements) undoBlock(bp, tasks[idx], occupancy)
    }

    const unassignedSet = new Set(unassigned)
    const reorderedIndices = [
      ...unassigned,
      ...tasks.map((_, i) => i).filter(i => !unassignedSet.has(i))
    ]
    const reorderedTasks = reorderedIndices.map(i => tasks[i])

    solverCounter.value = 0
    const retry = solveAll(reorderedTasks, occupancy, 12, distributeEquitably)

    const retryAssigned = new Map()
    for (const [retryIdx, placements] of retry.assigned.entries()) {
      retryAssigned.set(reorderedIndices[retryIdx], placements)
    }
    const retryUnassigned = retry.unassigned.map(retryIdx => reorderedIndices[retryIdx])

    if (retryUnassigned.length < prevUnassignedCount) {
      assigned = retryAssigned
      unassigned = retryUnassigned
    } else {
      for (const [retryIdx, placements] of retry.assigned.entries()) {
        for (const bp of placements) undoBlock(bp, reorderedTasks[retryIdx], occupancy)
      }
      for (const [idx, placements] of prevAssigned.entries()) {
        for (const bp of placements) applyBlock(bp, tasks[idx], occupancy)
      }
      assigned = prevAssigned
    }
  }

  // ─── Step 5: relaxation ───
  /** @type {number[]} */
  const stillUnassigned = []
  const sortedUnassigned = [...unassigned].sort(
    (a, b) => tasks[a].totalHours - tasks[b].totalHours
  )

  for (const idx of sortedUnassigned) {
    const task = tasks[idx]
    solverCounter.value = 0

    // conserveSlots is NEVER relaxed; only minConsecutive.
    /** @type {import('./types.js').SubjectTask} */
    const relaxedTask = {
      ...task,
      effectiveConserveSlots: task.effectiveConserveSlots,
      effectiveMinConsecutive: task.preventSingleHourBlocks ? 2 : 1,
      preventSingleHourBlocks: task.preventSingleHourBlocks
    }
    const placements = assignTask(relaxedTask, occupancy, distributeEquitably)
    if (placements) {
      assigned.set(idx, placements)
      continue
    }
    stillUnassigned.push(idx)
  }

  // ─── Step 5b: partial assignment fallback ───
  /** @type {number[]} */
  const finalUnassigned = []
  /** @type {Map<number, { placed: number, total: number }>} */
  const partialAssignments = new Map()

  for (const idx of stillUnassigned) {
    const task = tasks[idx]
    const minBlock = task.preventSingleHourBlocks ? 2 : 1
    let placed = false

    for (let tryHours = task.totalHours - 1; tryHours >= minBlock; tryHours--) {
      const remaining = task.totalHours - tryHours
      if (task.preventSingleHourBlocks && remaining > 0 && remaining < 2) continue

      solverCounter.value = 0
      /** @type {import('./types.js').SubjectTask} */
      const partialTask = {
        ...task,
        totalHours: tryHours,
        effectiveConserveSlots: Math.min(tryHours, task.effectiveConserveSlots),
        effectiveMinConsecutive: minBlock
      }

      const placements = assignTask(partialTask, occupancy, distributeEquitably)
      if (placements) {
        assigned.set(idx, placements)
        partialAssignments.set(idx, { placed: tryHours, total: task.totalHours })
        placed = true
        break
      }
    }

    if (!placed) finalUnassigned.push(idx)
  }

  // ─── Step 6: build output events ───
  /** @type {import('./types.js').ScheduleEvent[]} */
  const events = []

  if (lockedEvents.length > 0) {
    for (const le of lockedEvents) {
      if (le.extendedProps?.isCrossQuarterGhost) continue
      events.push(le)
    }
  }

  for (const [idx, placements] of assigned.entries()) {
    const task = tasks[idx]
    for (const bp of placements) {
      for (let offset = 0; offset < bp.length; offset++) {
        const [slotStart, slotEnd] = task.timeSlots[bp.startSlotIndex + offset]
        events.push({
          title: task.subject.subject,
          daysOfWeek: [bp.day],
          startTime: slotStart,
          endTime: slotEnd,
          extendedProps: {
            subjectId: task.subject.innerId,
            professorId: task.professorId,
            classroomId: bp.classroomId,
            classroomName: bp.classroomName,
            pnfId: task.subject.pnfId,
            trayectoId: task.subject.trayectoId,
            trayectoName: task.subject.trayectoName,
            seccion: task.subject.seccion,
            pnfName: task.subject.pnf,
            turnName: task.subject.turnoName,
            blockId: `${bp.day}-${task.subject.innerId}`
          }
        })
      }
    }
  }

  // ─── Step 7: error reporting ───
  const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  for (const idx of finalUnassigned) {
    const task = tasks[idx]
    const originalHours = task.subject.hours[trimestre] || task.totalHours
    const teacherObj = teachers?.find((t) => t.id === task.professorId)
    const professorName = (teacherObj && !teacherObj.is_placeholder)
      ? `${teacherObj.name} ${teacherObj.lastName}`
      : 'Sin Profesor Asignado'

    const availableDayNames = task.availableDays.map((d) => dayNames[d] || `Día ${d}`).join(', ')
    /** @type {string[]} */
    const problems = []
    /** @type {string[]} */
    const suggestions = []

    if (task.availableDays.length < days.length) {
      const restrictedDayNames = days
        .filter(d => !task.availableDays.includes(d))
        .map((d) => dayNames[d] || `Día ${d}`)
        .join(', ')
      problems.push(`El profesor solo puede dar clases los: ${availableDayNames} (tiene restringidos: ${restrictedDayNames})`)
      suggestions.push('Revise las restricciones del profesor y habilite más días')
    }

    if (task.candidateClassrooms.length < classrooms.length && task.candidateClassrooms.length <= 2) {
      const classroomNames = task.candidateClassrooms.map(c => c.classroom).join(', ')
      problems.push(`Solo puede usar las aulas: ${classroomNames}`)
      suggestions.push('Agregue más aulas permitidas para esta materia en las restricciones de materias')
    }

    if (task.restrictedHours.length > 0) {
      problems.push(`El profesor tiene ${task.restrictedHours.length} horas específicas restringidas`)
      suggestions.push('Revise las horas restringidas del profesor')
    }

    if (task.preventSingleHourBlocks) {
      problems.push('La opción "Evitar bloques de 1 hora" está activa y no se encontró espacio para bloques de 2+ horas consecutivas')
      suggestions.push('Desactive la opción en Configuración (⚙️) o libere más espacio en el horario')
    }

    if (problems.length === 0) {
      problems.push('Todas las aulas y horarios disponibles ya están ocupados por otras materias')
      suggestions.push('Agregue más aulas o ajuste las horas de otras materias para liberar espacio')
    }

    const description = [
      `No se pudo asignar: faltan ${task.totalHours} de ${originalHours} horas.`,
      '',
      `⚠️ Problema: ${problems.join('. ')}`,
      '',
      `💡 Sugerencia: ${suggestions.join('. ')}`
    ].join('\n')

    setErrors({
      name: task.subject.subject,
      description,
      seccion: task.subject.seccion,
      year: task.subject.trayectoName,
      turn: task.subject.turnoName,
      pnfName: task.subject.pnf || '',
      professorName,
      trimestre,
      subjectId: task.subject.innerId,
      professorId: task.professorId || undefined,
      trayectoId: task.subject.trayectoId,
      pnfId: task.subject.pnfId,
      totalHours: task.totalHours
    })
  }

  for (const [idx, partial] of partialAssignments.entries()) {
    const task = tasks[idx]
    const teacherObj = teachers?.find((t) => t.id === task.professorId)
    const professorName = (teacherObj && !teacherObj.is_placeholder)
      ? `${teacherObj.name} ${teacherObj.lastName}`
      : 'Sin Profesor Asignado'

    const remaining = partial.total - partial.placed
    const availableDayNames = task.availableDays.map((d) => dayNames[d] || `Día ${d}`).join(', ')

    const description = [
      `⚠️ Asignación parcial: se asignaron ${partial.placed} de ${partial.total} horas. Faltan ${remaining} horas.`,
      '',
      `El profesor solo puede dar clases los: ${availableDayNames}, y no hay suficiente espacio disponible para todas las horas.`,
      '',
      '💡 Sugerencia: Habilite más días para el profesor, agregue más aulas, o redistribuya otras materias para liberar espacio.'
    ].join('\n')

    setErrors({
      name: task.subject.subject,
      description,
      seccion: task.subject.seccion,
      year: task.subject.trayectoName,
      turn: task.subject.turnoName,
      pnfName: task.subject.pnf || '',
      professorName,
      trimestre,
      subjectId: task.subject.innerId,
      professorId: task.professorId || undefined,
      trayectoId: task.subject.trayectoId,
      pnfId: task.subject.pnfId,
      totalHours: remaining
    })
  }

  return events
}

/**
 * Merge consecutive events sharing the same `blockId`.
 * Gaps > 0 (anything where the next startTime !== current endTime) break the block.
 * @param {import('./types.js').ScheduleEvent[]} events
 * @returns {import('./types.js').ScheduleEvent[]}
 */
export function mergeConsecutiveEvents (events) {
  /** @type {import('./types.js').ScheduleEvent[]} */
  const merged = []

  const grouped = new Map()
  for (const event of events) {
    const key = event.extendedProps.blockId
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(event)
  }

  for (const group of grouped.values()) {
    const sorted = group.sort((a, b) => a.startTime.localeCompare(b.startTime))
    let i = 0
    while (i < sorted.length) {
      const current = { ...sorted[i] }
      let j = i + 1
      while (j < sorted.length && sorted[j].startTime === current.endTime) {
        current.endTime = sorted[j].endTime
        j++
      }
      merged.push(current)
      i = j
    }
  }

  return merged
}
