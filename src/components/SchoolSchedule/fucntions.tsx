import { Subject } from "../../interfaces/subject";

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
}

export const turnos: Record<string, [string, string][]> = {
  mañana: [
    ["07:00", "07:45"],
    ["07:45", "08:30"],
    ["08:30", "09:15"],
    ["09:15", "10:00"],
    ["10:00", "10:45"],
    ["10:45", "11:30"],
    ["11:30", "12:15"],
  ],
  tarde: [
    ["12:15", "13:00"],
    ["13:00", "13:45"],
    ["13:45", "14:30"],
    ["14:30", "15:15"],
    ["15:15", "16:00"],
    ["16:00", "16:45"],
    ["16:45", "17:30"],
  ],
  noche: [
    ["17:30", "18:15"],
    ["18:15", "19:00"],
    ["19:00", "19:45"],
    ["19:45", "20:30"],
    ["20:30", "21:15"],
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
    ["16:45", "17:30"],
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
}: generateScheduleParams): Event[] {
  const events: Event[] = [];
  const days = [1, 2, 3, 4, 5];

  const globalUsedSlots = new Set<string>();
  const sectionUsedSlots = new Set<string>();

  const cleanSubject = subjects.filter(
    (sub) =>
      Object.keys(sub.quarter).includes(trimestre) && sub?.hours?.[trimestre] && sub?.hours?.[trimestre] > 0
  );

  subjects = cleanSubject;

  // Precargar conflictos existentes
  if (existingEvents?.length) {
    for (const event of existingEvents) {
      const day = event.daysOfWeek[0];
      const start = event.startTime;
      const { professorId, classroomId, trayectoId, seccion, pnfId } = event.extendedProps;

      if (professorId) {
        globalUsedSlots.add(`${day}-${start}-${professorId}`);
      }
      globalUsedSlots.add(`${day}-${start}-${trayectoId}-${classroomId}`);
      sectionUsedSlots.add(`${day}-${start}-${pnfId}-${trayectoId}-${seccion}`);
    }
  }

  // Fase 1: profesores con restricciones
  const withRestrictions = subjects.filter((subject) =>
    unavailableDays?.some((r) => r.teacherId === subject.quarter[trimestre])
  );

  // Fase 2: profesores sin restricciones
  const withoutRestrictions = subjects.filter(
    (subject) => !unavailableDays?.some((r) => r.teacherId === subject.quarter[trimestre])
  );

  // Fase 3: materias no asignadas
  const unassignedSubjects: Subject[] = [];

  const assignSubject = (subject: Subject, ignoreRestrictions = false): boolean => {
    const hours = subject.hours[trimestre];
    const professorId = subject.quarter[trimestre];
    const turno = subject.turnoName?.toLowerCase();
    const preferConfig = preferredClassrooms?.find((p) => p.subjectId === subject.id);
    const timeSlots = preferConfig?.preferLastSlot ? [...turnos[turno]].reverse() : turnos[turno];

    if (!hours || !professorId || !timeSlots) {
      console.warn(`[ASIGNACIÓN FALLIDA] Materia: ${subject.subject} - Datos incompletos:`, {
        horas: hours,
        profesorId: professorId,
        turno: turno,
        timeSlots: timeSlots,
      });
      return false;
    }

    let remainingHours = hours;

    const restrictedDays = unavailableDays?.find((r) => r.teacherId === professorId)?.days ?? [];
    const availableDays = ignoreRestrictions ? days : days.filter((day) => !restrictedDays.includes(day));

    console.log(
      `[ASIGNANDO] Materia: ${subject.subject}, Horas: ${hours}, Días disponibles: ${availableDays.length}`
    );

    for (const day of availableDays) {
      if (remainingHours <= 0) break;

      // Obtener todas las asignaciones existentes de esta materia en este día
      const existingAssignments = events.filter(
        (event) => event.daysOfWeek[0] === day && event.extendedProps.subjectId === subject.innerId
      );

      const currentAssignedCount = existingAssignments.length;

      // Si ya hay asignaciones y alcanzó el límite, saltar este día
      if (currentAssignedCount >= conserveSlots) {
        console.log(`  [DÍA ${day}] Límite de slots (${conserveSlots}) alcanzado`);
        continue;
      }

      let blocksAssigned = 0;

      for (let i = 0; i < timeSlots.length && blocksAssigned < conserveSlots && remainingHours > 0; i++) {
        const [start, end] = timeSlots[i];

        // VERIFICACIÓN SIMPLE DE CONSECUTIVIDAD
        if (currentAssignedCount > 0) {
          // Obtener los horarios ya asignados
          const assignedStartTimes = existingAssignments.map((e) => e.startTime);

          // Verificar si este slot es consecutivo a algún horario ya asignado
          let isConsecutive = false;

          for (const assignedStart of assignedStartTimes) {
            // Encontrar el índice del horario asignado
            const assignedIndex = timeSlots.findIndex((slot) => slot[0] === assignedStart);

            // Verificar si el slot actual es inmediatamente anterior o posterior
            if (assignedIndex !== -1 && Math.abs(i - assignedIndex) === 1) {
              isConsecutive = true;
              break;
            }
          }

          // Si no es consecutivo, saltar este slot
          if (!isConsecutive) {
            console.log(`  [SLOT ${start}] No es consecutivo a asignaciones existentes`);
            continue;
          }
        }

        // VERIFICACIONES NORMALES DE DISPONIBILIDAD
        const candidateClassrooms = preferConfig?.classroomIds?.length
          ? classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
          : classrooms;

        let assigned = false;
        let assignmentReason = "";

        for (const classroom of candidateClassrooms) {
          const conflictKeyProf = `${day}-${start}-${professorId}`;
          const conflictKeyRoom = `${day}-${start}-${subject.trayectoId}-${classroom.id}`;
          const conflictKeySection = `${day}-${start}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`;

          const hasProfConflict = globalUsedSlots.has(conflictKeyProf);
          const hasRoomConflict = globalUsedSlots.has(conflictKeyRoom);
          const hasSectionConflict = sectionUsedSlots.has(conflictKeySection);

          if (hasProfConflict || hasRoomConflict || hasSectionConflict) {
            assignmentReason = `Conflictos: ${hasProfConflict ? "Profesor " : ""}${
              hasRoomConflict ? "Aula " : ""
            }${hasSectionConflict ? "Sección" : ""}`;
            continue;
          }

          const blockId = `${day}-${subject.innerId}`;

          if (!isConsecutiveToExisting(subject.innerId, day, i, events, timeSlots)) {
            assignmentReason = "No es consecutivo a eventos existentes";
            continue; // no es consecutivo, saltar
          }

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
              blockId,
            },
          });

          globalUsedSlots.add(conflictKeyProf);
          globalUsedSlots.add(conflictKeyRoom);
          sectionUsedSlots.add(conflictKeySection);
          blocksAssigned++;
          remainingHours--;
          assigned = true;
          console.log(`  [ASIGNADO] Día ${day}, ${start}-${end}, Aula: ${classroom.classroom}`);
          break;
        }

        if (!assigned) {
          console.log(`  [SLOT ${start}] No asignado - ${assignmentReason || "Todas las aulas ocupadas"}`);
        }
      }
    }

    if (remainingHours > 0) {
      console.warn(
        `[ASIGNACIÓN INCOMPLETA] Materia: ${subject.subject} - Horas faltantes: ${remainingHours}/${hours}`
      );
      console.warn(
        `  Días disponibles: ${availableDays.length}, Días restringidos: ${restrictedDays.length}`
      );
    } else {
      console.log(`[ASIGNACIÓN COMPLETA] Materia: ${subject.subject} - Todas las horas asignadas`);
    }

    return remainingHours === 0;
  };

  // Ejecutar fases
  console.log("=== FASE 1: Profesores con restricciones ===");
  for (const subject of withRestrictions) {
    const success = assignSubject(subject, false);
    if (!success) unassignedSubjects.push(subject);
  }

  console.log("=== FASE 2: Profesores sin restricciones ===");
  for (const subject of withoutRestrictions) {
    const success = assignSubject(subject, false);
    if (!success) unassignedSubjects.push(subject);
  }

  console.log("=== FASE 3: Reintentar materias no asignadas (ignorando restricciones) ===");
  for (const subject of unassignedSubjects) {
    const success = assignSubject(subject, true); // Ignorar restricciones como último recurso

    if (!success) {
      console.error(
        `[MATERIA NO ASIGNADA] ${subject.subject} - No se pudo asignar completamente incluso ignorando restricciones`
      );
      console.error(
        `  Horas: ${subject.hours[trimestre]}, Profesor: ${subject.quarter[trimestre]}, Turno: ${subject.turnoName}`
      );
    }
  }

  // Resumen final
  const assignedHours = events.reduce((total, event) => {
    const subject = subjects.find((s) => s.innerId === event.extendedProps.subjectId);
    return total + (subject?.hours[trimestre] || 0);
  }, 0);

  const totalHours = subjects.reduce((total, subject) => total + (subject.hours[trimestre] || 0), 0);

  console.log("=== RESUMEN FINAL ===");
  console.log(`Total materias: ${subjects.length}`);
  console.log(`Materias no asignadas completamente: ${unassignedSubjects.length}`);
  console.log(`Horas asignadas: ${assignedHours}/${totalHours}`);

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

