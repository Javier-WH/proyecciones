import { Subject } from "../../interfaces/subject";
import { scheduleError } from "./ErrorsModal";

export interface Classroom {
  id: string;
  classroom: string;
}

export interface Event {
  title: string;
  daysOfWeek: number[]; // 1 = lunes, ..., 5 = viernes
  startTime: string;
  endTime: string;
  extendedProps: {
    subjectId: string;
    professorId: string | null;
    classroomId: string;
    classroomName: string;
    pnfId: string;
    trayectoId: string;
    seccion: string;
    pnfName: string;
    turnName: string;
    blockId: string;
  };
}

export interface generateScheduleParams {
  subjects: Subject[];
  classrooms: Classroom[];
  trimestre: "q1" | "q2" | "q3";
  unavailableDays?: { teacherId: string; days: number[] }[];
  preferredClassrooms?: { subjectId: string; classroomIds: string[]; preferLastSlot?: boolean }[];
  existingEvents?: Event[];
  conserveSlots?: number;
  setErrors?: (err: scheduleError) => void;
}

export const turnos: Record<string, [string, string][]> = {
  mañana: [
    ["07:00", "07:45"],
    ["07:45", "08:30"],
    ["08:30", "09:15"],
    ["09:15", "10:00"],
    ["10:00", "10:45"],
    ["10:45", "11:30"],
  ],
  tarde: [
    ["12:15", "13:00"],
    ["13:00", "13:45"],
    ["13:45", "14:30"],
    ["14:30", "15:15"],
    ["15:15", "16:00"],
    ["16:00", "16:45"],
  ],
  nocturno: [
    ["16:00", "16:45"],
    ["16:45", "17:30"],
    ["17:30", "18:15"],
    ["18:15", "19:00"],
    ["19:00", "19:45"],
    ["19:45", "20:30"],
  ],
  diurno: [
    ["07:00", "07:45"],
    ["07:45", "08:30"],
    ["08:30", "09:15"],
    ["09:15", "10:00"],
    ["10:00", "10:45"],
    ["10:45", "11:30"],
    ["11:30", "12:15"],
    ["12:15", "13:00"],
    ["13:00", "13:45"],
    ["13:45", "14:30"],
    ["14:30", "15:15"],
    ["15:15", "16:00"],
    ["16:00", "16:45"],
  ],
};

/**
 * Genera un horario para los profesores y materias pasadas como parámetro.
 * Intenta asignar materias a los profesores con restricciones en los horarios disponibles.
 * Si no hay horarios disponibles, intenta asignar materias a los profesores sin restricciones.
 * Si aún no hay horarios disponibles, intenta asignar materias a los profesores con restricciones, ignorando las restricciones.
 * @param {generateScheduleParams} params - parámetros para generar el horario
 * @param {Subject[]} params.subjects - lista de materias de la proyección
 * @param {Classroom[]} params.classrooms - lista de todos los salones disponibles (interface Classroom)
 * @param {string} params.trimestre - trimestre donde se generaran los datos del usuario, solo admite (q1, q2 o q3)
 * @param {Object[]} [params.unavailableDays] - Días no disponibles para cada profesor { teacherId: string; days: number[] }[], 1-lunes, 2-martes, 3-miercoles, 4-jueves, 5-viernes
 * @param {Event[]} [params.existingEvents] - eventos existentes que se deberán respetar, si existem datos guardados deben ser sumisrados aqui
 * @param {Object[]} [params.preferredClassrooms] - restricción de salones por materia { subjectId: string; classroomIds: string[]; preferLastSlot?: boolean }[], selecciona que salones es preferible para la materia y si debe estar al final del dia
 * @param {number} [params.conserveSlots=3] - cuantas horas al dia como maximo se debe ver una materia, por defecto 3
 * @return {Event[]} - eventos generados (interface Event [])
 */
export function generateScheduleEvents({
  subjects,
  classrooms,
  trimestre,
  unavailableDays,
  existingEvents,
  preferredClassrooms,
  conserveSlots = 3,
  setErrors = (err) => console.log(err),
}: generateScheduleParams): Event[] {
  const events: Event[] = [];
  const days = [1, 2, 3, 4, 5];

  const globalUsedSlots = new Set<string>();
  const sectionUsedSlots = new Set<string>();

  // Precargar conflictos existentes y filtrar materias ya agendadas
  const existingSubjectIds = new Set<string>();
  const existingSubjectKeys = new Set<string>(); // Clave compuesta para mayor seguridad

  if (existingEvents?.length) {
    for (const event of existingEvents) {
      if (!event?.extendedProps || !event?.daysOfWeek?.length) continue;

      const day = event.daysOfWeek[0];
      const start = event.startTime;
      const { professorId, classroomId, trayectoId, seccion, pnfId, subjectId } = event.extendedProps;
      const title = event.title;

      if (subjectId) {
        existingSubjectIds.add(subjectId);
      }

      // Crear clave compuesta: NombreMateria-Seccion-PNF-Trayecto
      if (title && seccion && pnfId && trayectoId) {
        const compositeKey = `${title.trim().toLowerCase()}-${seccion}-${pnfId}-${trayectoId}`;
        existingSubjectKeys.add(compositeKey);
      }

      if (professorId) {
        globalUsedSlots.add(`PROF-${day}-${start}-${professorId}`);
      }
      if (classroomId) {
        globalUsedSlots.add(`ROOM-${day}-${start}-${classroomId}`);
      }
      sectionUsedSlots.add(`SEC-${day}-${start}-${pnfId}-${trayectoId}-${seccion}`);
    }
  }

  // Filtrar materias que ya están en los eventos existentes
  const cleanSubject = subjects.filter((sub) => {
    const isQuarterMatch =
      Object.keys(sub.quarter).includes(trimestre) && sub?.hours?.[trimestre] && sub?.hours?.[trimestre] > 0;

    if (!isQuarterMatch) return false;

    // Verificar por ID (usando innerId que es lo que guardamos)
    const hasIdConflict = existingSubjectIds.has(sub.innerId) || existingSubjectIds.has(sub.id);

    // Verificar por clave compuesta
    const compositeKey = `${sub.subject.trim().toLowerCase()}-${sub.seccion}-${sub.pnfId}-${sub.trayectoId}`;
    const hasKeyConflict = existingSubjectKeys.has(compositeKey);

    return !hasIdConflict && !hasKeyConflict;
  });

  subjects = cleanSubject;

  // Fase 1: profesores con restricciones
  const withRestrictions = subjects.filter((subject) =>
    unavailableDays?.some((r) => r.teacherId === subject.quarter[trimestre])
  );

  // Fase 2: profesores sin restricciones
  const withoutRestrictions = subjects.filter(
    (subject) => !unavailableDays?.some((r) => r.teacherId === subject.quarter[trimestre])
  );

  // Fase 3: materias no asignadas
  const unassignedSubjects: Array<{
    subject: Subject;
    reason: string;
    assignedHours: number;
    totalHours: number;
  }> = [];

  const assignSubject = (
    subject: Subject,
    ignoreRestrictions = false
  ): { success: boolean; reason?: string; assignedHours: number } => {
    const hours = subject.hours[trimestre];
    const professorId = subject.quarter[trimestre];
    const turno = subject.turnoName?.toLowerCase();
    const preferConfig = preferredClassrooms?.find((p) => p.subjectId === subject.id);
    const timeSlots = preferConfig?.preferLastSlot ? [...turnos[turno]].reverse() : turnos[turno];

    if (!hours || !professorId || !timeSlots) {
      const reason = `Datos incompletos: ${!hours ? "Horas no definidas" : ""}${
        !professorId ? ", Profesor no asignado" : ""
      }${!timeSlots ? ", Turno no válido" : ""}`;
      return { success: false, reason, assignedHours: 0 };
    }

    let remainingHours = hours;
    let totalAssignedInThisCall = 0;

    const restrictedDays = unavailableDays?.find((r) => r.teacherId === professorId)?.days ?? [];
    const availableDays = ignoreRestrictions ? days : days.filter((day) => !restrictedDays.includes(day));

    // Verificar disponibilidad básica
    if (availableDays.length === 0) {
      const reason = ignoreRestrictions
        ? `Profesor sin días disponibles incluso ignorando restricciones (días restringidos: ${restrictedDays.join(
            ", "
          )})`
        : `Profesor sin días disponibles (días restringidos: ${restrictedDays.join(", ")})`;
      return { success: false, reason, assignedHours: 0 };
    }

    const candidateClassrooms = preferConfig?.classroomIds?.length
      ? classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
      : classrooms;

    if (candidateClassrooms.length === 0) {
      const reason = `No hay aulas disponibles para esta materia${
        preferConfig ? " (aulas preferidas no disponibles)" : ""
      }`;
      return { success: false, reason, assignedHours: 0 };
    }

    for (const day of availableDays) {
      if (remainingHours <= 0) break;

      // Obtener todas las asignaciones existentes de esta materia en este día
      const existingAssignments = events.filter(
        (event) => event.daysOfWeek[0] === day && event.extendedProps.subjectId === subject.innerId
      );

      const currentAssignedCount = existingAssignments.length;

      // Si ya hay asignaciones y alcanzó el límite, saltar este día
      if (currentAssignedCount >= conserveSlots) {
        continue;
      }

      let blocksAssigned = 0;

      for (let i = 0; i < timeSlots.length && blocksAssigned < conserveSlots && remainingHours > 0; i++) {
        const [start, end] = timeSlots[i];

        // VERIFICACIÓN DE CONSECUTIVIDAD
        if (currentAssignedCount > 0) {
          const assignedStartTimes = existingAssignments.map((e) => e.startTime);
          let isConsecutive = false;

          for (const assignedStart of assignedStartTimes) {
            const assignedIndex = timeSlots.findIndex((slot) => slot[0] === assignedStart);
            if (assignedIndex !== -1 && Math.abs(i - assignedIndex) === 1) {
              isConsecutive = true;
              break;
            }
          }

          if (!isConsecutive) {
            continue;
          }
        }

        // VERIFICACIONES DE DISPONIBILIDAD
        let assigned = false;
        let assignmentFailureReason = "";

        for (const classroom of candidateClassrooms) {
          const conflictKeyProf = `PROF-${day}-${start}-${professorId}`;
          const conflictKeyRoom = `ROOM-${day}-${start}-${classroom.id}`;
          const conflictKeySection = `SEC-${day}-${start}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`;

          const hasProfConflict = globalUsedSlots.has(conflictKeyProf);
          const hasRoomConflict = globalUsedSlots.has(conflictKeyRoom);
          const hasSectionConflict = sectionUsedSlots.has(conflictKeySection);

          if (hasProfConflict || hasRoomConflict || hasSectionConflict) {
            const conflicts = [];
            if (hasProfConflict) conflicts.push("profesor ocupado");
            if (hasRoomConflict) conflicts.push("aula ocupada");
            if (hasSectionConflict) conflicts.push("sección con conflicto de horario");
            assignmentFailureReason = `Conflictos: ${conflicts.join(", ")}`;
            continue;
          }

          if (!isConsecutiveToExisting(subject.innerId, day, i, events, timeSlots)) {
            assignmentFailureReason = "No es consecutivo a eventos existentes";
            continue;
          }

          // ASIGNACIÓN EXITOSA
          events.push({
            title: subject.subject,
            daysOfWeek: [day],
            startTime: start,
            endTime: end,
            extendedProps: {
              subjectId: subject.innerId,
              professorId,
              classroomId: classroom.id,
              classroomName: classroom.classroom,
              pnfId: subject.pnfId,
              trayectoId: subject.trayectoId,
              seccion: subject.seccion,
              pnfName: subject.pnf,
              turnName: subject.turnoName,
              blockId: `${day}-${subject.innerId}`,
            },
          });

          globalUsedSlots.add(conflictKeyProf);
          globalUsedSlots.add(conflictKeyRoom);
          sectionUsedSlots.add(conflictKeySection);
          blocksAssigned++;
          remainingHours--;
          totalAssignedInThisCall++;
          assigned = true;
          break;
        }

        if (!assigned && assignmentFailureReason) {
          // Podemos registrar aquí los fallos detallados si es necesario
        }
      }
    }

    // Determinar la razón del fallo si no se asignaron todas las horas
    if (remainingHours > 0) {
      let reason = "";

      if (totalAssignedInThisCall === 0) {
        reason = `No se pudo asignar ninguna hora. Razones posibles: `;
        const reasons = [];

        if (availableDays.length === 0) {
          reasons.push("sin días disponibles");
        }
        if (candidateClassrooms.length === 0) {
          reasons.push("sin aulas disponibles");
        }
        if (restrictedDays.length > 0 && !ignoreRestrictions) {
          reasons.push(`profesor con ${restrictedDays.length} días restringidos`);
        }

        reason += reasons.length > 0 ? reasons.join(", ") : "horarios y aulas ocupados";
      } else {
        reason = `Solo se asignaron ${totalAssignedInThisCall} de ${hours} horas. Razones: `;
        const reasons = [];

        if (remainingHours > 0) {
          reasons.push(`falta de horarios consecutivos disponibles`);
        }
        if (availableDays.length < days.length) {
          reasons.push(`solo ${availableDays.length} días disponibles de ${days.length}`);
        }

        reason += reasons.join(", ");
      }

      return { success: false, reason, assignedHours: totalAssignedInThisCall };
    }

    return { success: true, assignedHours: hours };
  };

  // Ejecutar fases
  for (const subject of withRestrictions) {
    const result = assignSubject(subject, false);
    if (!result.success) {
      unassignedSubjects.push({
        subject,
        reason: `[FASE 1] ${result.reason}`,
        assignedHours: result.assignedHours,
        totalHours: Number(subject.hours[trimestre]),
      });
    }
  }

  for (const subject of withoutRestrictions) {
    const result = assignSubject(subject, false);
    if (!result.success) {
      unassignedSubjects.push({
        subject,
        reason: `[FASE 2] ${result.reason}`,
        assignedHours: result.assignedHours,
        totalHours: Number(subject.hours[trimestre]),
      });
    }
  }

  // FASE 3: Reintentar materias no asignadas ignorando restricciones
  const stillUnassigned: typeof unassignedSubjects = [];

  for (const item of unassignedSubjects) {
    const result = assignSubject(item.subject, true);
    if (!result.success) {
      stillUnassigned.push({
        subject: item.subject,
        reason: `[FASE 3] ${result.reason}`,
        assignedHours: result.assignedHours,
        totalHours: item.totalHours,
      });
    }
  }

  // Reportar errores finales
  for (const item of stillUnassigned) {
    setErrors({
      name: item.subject.subject,
      description: `${item.subject.subject} - No se pudo asignar completamente. ${item.reason} (Asignadas: ${item.assignedHours}/${item.totalHours} horas)`,
      seccion: item.subject.seccion,
      year: item.subject.trayectoName,
      turn: item.subject.turnoName,
    });
  }

  // Resumen final
  const assignedHours = events.reduce((total, event) => {
    const subject = subjects.find((s) => s.innerId === event.extendedProps.subjectId);
    return total + (subject?.hours[trimestre] || 0);
  }, 0);

  /*const totalHours = subjects.reduce((total, subject) => total + (subject.hours[trimestre] || 0), 0);

 console.log("=== RESUMEN FINAL ===");
  console.log(`Total materias: ${subjects.length}`);
  console.log(`Materias no asignadas completamente: ${stillUnassigned.length}`);
  console.log(`Horas asignadas: ${assignedHours}/${totalHours}`);*/

  if (stillUnassigned.length > 0) {
    console.log("=== MATERIAS NO ASIGNADAS ===");
    stillUnassigned.forEach((item) => {
      console.log(`- ${item.subject.subject}: ${item.reason}`);
    });
  }

  return events;
}
/**
 * Agrupa eventos consecutivos con el mismo blockId y mergea sus horarios.
 * @param events lista de eventos a agrupar
 * @returns lista de eventos con horarios mergeados
 */
export function mergeConsecutiveEvents(events: Event[]): Event[] {
  const merged: Event[] = [];

  // Agrupar por blockId
  const grouped = new Map<string, Event[]>();
  for (const event of events) {
    const key = event.extendedProps.blockId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  for (const group of grouped.values()) {
    const sorted = group.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let i = 0;
    while (i < sorted.length) {
      const current = { ...sorted[i] };
      let j = i + 1;

      while (j < sorted.length && sorted[j].startTime === current.endTime) {
        current.endTime = sorted[j].endTime;
        j++;
      }

      merged.push(current);
      i = j;
    }
  }

  return merged;
}

/**
 * Verificar si un índice candidato es adyacente a un horario ya asignado en el mismo día.
 * @param subjectId identificador del bloque a asignar
 * @param day día de la semana (1-7)
 * @param candidateIndex índice candidato a asignar
 * @param events lista de eventos ya asignados
 * @param timeSlots lista de horarios posibles
 * @returns true si el índice candidato es adyacente, false de lo contrario
 */
function isConsecutiveToExisting(
  subjectId: string,
  day: number,
  candidateIndex: number,
  events: Event[],
  timeSlots: [string, string][]
): boolean {
  const assignedEvents = events.filter(
    (e) => e.daysOfWeek[0] === day && e.extendedProps.subjectId === subjectId
  );

  const assignedIndices = assignedEvents
    .map((e) => timeSlots.findIndex((slot) => slot[0] === e.startTime))
    .filter((i) => i !== -1)
    .sort((a, b) => a - b);

  if (assignedIndices.length === 0) return true; // primer bloque del día

  // Verificar si el nuevo índice es adyacente a alguno ya asignado
  return assignedIndices.some((i) => Math.abs(candidateIndex - i) === 1);
}

