// =====================================================
// JSDoc typedefs mirroring the TS interfaces from
// src/components/SchoolSchedule/fucntions.tsx. Pure documentation;
// no runtime output. Import via `import('./types.js').XYZ` in JSDoc.
// =====================================================

/**
 * @typedef {Object} Classroom
 * @property {string} id
 * @property {string} classroom
 * @property {boolean} [active]
 * @property {boolean} [exclusive]
 */

/**
 * @typedef {Object} EventExtendedProps
 * @property {string} subjectId
 * @property {string | null} professorId
 * @property {string} classroomId
 * @property {string} classroomName
 * @property {string} pnfId
 * @property {string} trayectoId
 * @property {string} [trayectoName]
 * @property {string} seccion
 * @property {string} pnfName
 * @property {string} turnName
 * @property {string} blockId
 * @property {'schedule' | 'staging'} [location]
 * @property {boolean} [isCrossQuarterGhost]
 * @property {'q1' | 'q2' | 'q3'} [ghostSourceQuarter]
 * @property {boolean} [ghostSourceIsSemestral]
 */

/**
 * @typedef {Object} ScheduleEvent
 * @property {string} title
 * @property {number[]} daysOfWeek
 * @property {string} startTime
 * @property {string} endTime
 * @property {EventExtendedProps} extendedProps
 */

/**
 * @typedef {Object} Subject
 * @property {string} innerId
 * @property {string} subject
 * @property {string} seccion
 * @property {string} pnfId
 * @property {string} [pnf]
 * @property {string} trayectoId
 * @property {string} [trayectoName]
 * @property {string} [turnoName]
 * @property {boolean} [isSemestral]
 * @property {{ q1?: number | null, q2?: number | null, q3?: number | null }} hours
 * @property {{ q1?: string | null, q2?: string | null, q3?: string | null }} quarter
 */

/**
 * @typedef {Object} TeacherRestriction
 * @property {string} teacherId
 * @property {number[]} days
 * @property {{ day: number, start: string, end: string }[]} [hours]
 */

/**
 * @typedef {Object} PreferredClassroom
 * @property {string} subjectKey
 * @property {string[]} classroomIds
 * @property {string} [subjectName]
 * @property {boolean} [preferLastSlot]
 * @property {string} [pnfId]
 * @property {boolean} [isExclusive]
 * @property {boolean} [splitHours]
 */

/**
 * @typedef {Object} ClassroomOverride
 * @property {string} subject_name
 * @property {string} [seccion]
 * @property {string} [pnf_id]
 * @property {string} [trayecto_id]
 * @property {number} day
 * @property {string} start_time
 * @property {string} end_time
 * @property {string} classroom_id
 */

/**
 * @typedef {Object} ScheduleError
 * @property {string} name
 * @property {string} description
 * @property {string} seccion
 * @property {string | null | undefined} year
 * @property {string | null | undefined} turn
 * @property {string} pnfName
 * @property {string | undefined} [professorName]
 * @property {'q1' | 'q2' | 'q3'} trimestre
 * @property {string} [subjectId]
 * @property {string} [professorId]
 * @property {string} [trayectoId]
 * @property {string} [pnfId]
 * @property {number} [totalHours]
 */

/**
 * @typedef {Object} GenerateScheduleParams
 * @property {Subject[]} subjects
 * @property {Classroom[]} classrooms
 * @property {'q1' | 'q2' | 'q3'} trimestre
 * @property {TeacherRestriction[]} [unavailableDays]
 * @property {PreferredClassroom[]} [preferredClassrooms]
 * @property {ClassroomOverride[]} [classroomOverrides]
 * @property {number} [conserveSlots]
 * @property {number} [minConsecutiveSlots]
 * @property {number} [preferredConsecutiveSlots]
 * @property {(err: ScheduleError) => void} [setErrors]
 * @property {number[]} [customDays]
 * @property {Record<string, [string, string][]>} [customTurnos]
 * @property {boolean} [distributeEquitably]
 * @property {any[]} [teachers]
 * @property {boolean} [preventSingleHourBlocks]
 * @property {{ start: string, end: string }[]} [breaks]
 * @property {ScheduleEvent[]} [lockedEvents]
 */

/**
 * @typedef {Object} SubjectTask
 * @property {Subject} subject
 * @property {number} totalHours
 * @property {string} professorId
 * @property {string} turnoName
 * @property {[string, string][]} timeSlots
 * @property {number[]} availableDays
 * @property {{ day: number, start: string, end: string }[]} restrictedHours
 * @property {Classroom[]} candidateClassrooms
 * @property {number} effectiveConserveSlots
 * @property {number} effectiveMinConsecutive
 * @property {boolean} preferLastSlot
 * @property {number} constraintScore
 * @property {boolean} preventSingleHourBlocks
 * @property {boolean} hasTeacherRestrictions
 * @property {boolean} hasClassroomRestrictions
 * @property {boolean} isClassroomExclusive
 * @property {{ start: string, end: string }[]} [breaks]
 */

/**
 * @typedef {Object} BlockPlacement
 * @property {number} day
 * @property {number} startSlotIndex
 * @property {number} length
 * @property {string} classroomId
 * @property {string} classroomName
 */

export {}
