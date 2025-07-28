import { Subject } from "../../../../interfaces/subject";
import { Turno } from "../../../../interfaces/turnos";
import { ScheduleItem } from "../../scheduleInterfaces";
import { Classroom, Days, Hours } from "../../sechedule";

export interface GenerateScheduleProps {
  schedule: ScheduleItem[];
  filteredSubjects: Subject[];
  turnos: Turno[];
  filteredDays: Days[];
  filteredHours: Hours[];
  classrooms: Classroom[];
  quarter: "q1" | "q2" | "q3";
  maxHoursPerDay?: number;
}

export interface GenerateScheduleResponse {
  classroom_id: string;
  day_id: string;
  hours_id: string;
  subject_id: string;
  teacher_id: string;
  turn_id: string;
  trayecto_id: string;
  pnf_id: string;
  seccion: string;
  quarter: string;
}

export function generateSchedule({
  schedule,
  filteredSubjects,
  turnos,
  filteredDays,
  filteredHours,
  classrooms,
  quarter = "q1",
  maxHoursPerDay = 3,
}: GenerateScheduleProps): GenerateScheduleResponse[] {
  const occupiedClassrooms = new Set<string>();
  const occupiedPNFs = new Set<string>();
  const occupiedTeachers = new Set<string>();
  const scheduleData: GenerateScheduleResponse[] = [];

  // Estructuras para control de restricciones
  const subjectDayHourAssignments = new Set<string>();
  const subjectHoursPerDay = new Map<string, number>();
  const subjectClassroomPerDay = new Map<string, string>();
  // { subject-day: [hourId1, hourId2] } - Mantiene las horas asignadas a una materia en un día
  const subjectDayAssignments = new Map<string, string[]>();
  // { subject-day: classroomId } - Mantiene el aula asignada a una materia en un día
  const subjectDayClassroom = new Map<string, string>();

  // Cargar horas ocupadas desde horario existente
  if (schedule.length > 0) {
    for (const scheduleItem of schedule) {
      const key = `${scheduleItem.day_id}-${scheduleItem.hours_id}-${scheduleItem.classroom_id}-${scheduleItem.quarter}`;
      occupiedClassrooms.add(key);

      const pnfKey = `${scheduleItem.day_id}-${scheduleItem.hours_id}-${scheduleItem.pnf_id}-${scheduleItem.trayecto_id}-${scheduleItem.seccion}-${scheduleItem.turn_id}-${scheduleItem.quarter}`;
      occupiedPNFs.add(pnfKey);

      const teacherKey = `${scheduleItem.day_id}-${scheduleItem.hours_id}-${scheduleItem.teacher_id}-${scheduleItem.quarter}`;
      occupiedTeachers.add(teacherKey);

      // Inicializar contadores para restricciones
      const subjectDayKey = `${scheduleItem.subject_id}-${scheduleItem.day_id}`;
      const currentCount = subjectHoursPerDay.get(subjectDayKey) || 0;
      subjectHoursPerDay.set(subjectDayKey, currentCount + 1);

      const subjectDayHourKey = `${scheduleItem.subject_id}-${scheduleItem.day_id}-${scheduleItem.hours_id}`;
      subjectDayHourAssignments.add(subjectDayHourKey);

      // Registrar aula usada por materia en día
      subjectClassroomPerDay.set(subjectDayKey, scheduleItem.classroom_id);

      // Cargar asignaciones existentes para agrupamiento
      const existingHours = subjectDayAssignments.get(subjectDayKey) || [];
      existingHours.push(scheduleItem.hours_id);
      subjectDayAssignments.set(subjectDayKey, existingHours);
      subjectDayClassroom.set(subjectDayKey, scheduleItem.classroom_id);
    }
  }
 
  // Ordenar horas cronológicamente
  const sortedHours = [...filteredHours].sort((a, b) => {
    const timeA = new Date(`1970-01-01T${a.start_time}`);
    const timeB = new Date(`1970-01-01T${b.start_time}`);
    return timeA.getTime() - timeB.getTime();
  });

  /**
   * Encuentra un slot consecutivo para una materia en un día dado.
   * @param dayId El ID del día.
   * @param subjectId El ID de la materia.
   * @param teacherId El ID del profesor.
   * @param turnoId El ID del turno.
   * @param subject El objeto de la materia.
   * @param requiredClassroom El ID del aula requerida si ya hay una asignada para esta materia en este día.
   * @returns Un objeto con hourId y classroomId si se encuentra un slot consecutivo, de lo contrario, null.
   */
  const findConsecutiveSlot = (
    dayId: string,
    subjectId: string,
    teacherId: string,
    turnoId: string,
    subject: Subject,
    requiredClassroom: string | null
  ): { hourId: string; classroomId: string } | null => {
    const subjectDayKey = `${subjectId}-${dayId}`;
    const existingHours = subjectDayAssignments.get(subjectDayKey) || [];

    // Si ya hay horas asignadas, buscar la siguiente consecutiva
    if (existingHours.length > 0) {
      // Ordenar las horas asignadas para asegurar que 'lastHour' es realmente la última
      const sortedExistingHours = [...existingHours].sort((a, b) => {
        const hourA = sortedHours.find((h) => h.id === a);
        const hourB = sortedHours.find((h) => h.id === b);
        if (!hourA || !hourB) return 0;
        const timeA = new Date(`1970-01-01T${hourA?.start_time}`);
        const timeB = new Date(`1970-01-01T${hourB?.start_time}`);
        return timeA.getTime() - timeB.getTime();
      });

      const lastHour = sortedExistingHours[sortedExistingHours.length - 1];
      const lastHourIndex = sortedHours.findIndex((h) => h.id === lastHour);

      // Verificar si hay una hora siguiente disponible en el mismo día
      if (lastHourIndex < sortedHours.length - 1) {
        const nextHour = sortedHours[lastHourIndex + 1];
        // Si hay un aula ya asignada para esta materia en este día, debe ser la misma.
        // De lo contrario, se permite buscar en cualquier aula disponible.
        const classroomId = requiredClassroom || subjectDayClassroom.get(subjectDayKey);

        // Si ya hay un aula asignada y no se encuentra, o si no hay aula asignada y no se encuentra ninguna,
        // no se puede asignar de forma consecutiva
        if (!classroomId) {
          // Esto solo debería pasar para la primera asignación del día si no hay requiredClassroom
          // En el caso de consecutivas, always requiredClassroom should be present
          return null;
        }

        // Verificar disponibilidad del slot de la hora consecutiva
        const classroomSlot = `${dayId}-${nextHour.id}-${classroomId}-${quarter}`;
        const pnfSlot = `${dayId}-${nextHour.id}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}-${turnoId}-${quarter}`;
        const teacherSlot = `${dayId}-${nextHour.id}-${teacherId}-${quarter}`;
        const subjectDayHourKey = `${subjectId}-${dayId}-${nextHour.id}`;

        if (
          !occupiedClassrooms.has(classroomSlot) &&
          !occupiedPNFs.has(pnfSlot) &&
          !occupiedTeachers.has(teacherSlot) &&
          !subjectDayHourAssignments.has(subjectDayHourKey)
        ) {
          return { hourId: nextHour.id, classroomId };
        }
      }
    }
    return null;
  };

  for (const subject of filteredSubjects) {
    let assigned = false;
    let selectedDay = "";
    let selectedHour = "";
    let selectedClassroom = "";

    if (!subject.quarter || subject.quarter[quarter] === undefined) {
      console.warn(`Materia sin cuatrimestre asignado: ${subject.subject}`);
      continue;
    }

    const turnoId =
      turnos.find((turno) => turno.name.toLowerCase() === subject.turnoName.toLowerCase())?.id || null;

    const teacherId = subject?.quarter?.[quarter] || null;

    if (!teacherId || !turnoId) {
      continue;
    }

    // Contador para horas asignadas por día para esta materia
    const getSubjectDayCount = (dayId: string) => subjectHoursPerDay.get(`${subject.id}-${dayId}`) || 0;

    // Iterar por cada día para intentar asignar la materia
    outerLoop: for (const day of filteredDays) {
      const subjectDayKey = `${subject.id}-${day.id}`;
      const currentCount = getSubjectDayCount(day.id);

      // Si ya alcanzó el máximo de horas por día para esta materia, pasar al siguiente día
      if (currentCount >= maxHoursPerDay) continue;

      // Si la materia ya tiene asignaciones en este día, intentar asignar de forma consecutiva
      if (currentCount > 0) {
        const consecutiveSlot = findConsecutiveSlot(
          day.id,
          subject.id,
          teacherId,
          turnoId,
          subject,
          subjectClassroomPerDay.get(subjectDayKey) || null // Aseguramos que busque en el aula ya asignada
        );

        if (consecutiveSlot) {
          selectedDay = day.id;
          selectedHour = consecutiveSlot.hourId;
          selectedClassroom = consecutiveSlot.classroomId;
          assigned = true;
          break outerLoop; // Se encontró un slot consecutivo, salir de los bucles
        }
        // Si no se encontró un slot consecutivo para una materia que ya tiene horas asignadas en este día,
        // NO se debe intentar una asignación no consecutiva en este mismo día para esa materia.
        // Se debe pasar al siguiente día.
        continue;
      }

      // Si la materia no tiene asignaciones previas en este día (currentCount === 0),
      // buscar la primera hora disponible para empezar la secuencia.
      const classroomsToCheck = classrooms; // Puede ser cualquier aula disponible

      for (const hour of sortedHours) {
        const subjectDayHourKey = `${subject.id}-${day.id}-${hour.id}`;
        // Si la hora ya está asignada a esta materia en este día, saltarla.
        // Esto previene que se asigne la misma materia en la misma hora dos veces.
        if (subjectDayHourAssignments.has(subjectDayHourKey)) {
          continue;
        }

        for (const classroom of classroomsToCheck) {
          const classroomSlot = `${day.id}-${hour.id}-${classroom.id}-${quarter}`;
          const pnfSlot = `${day.id}-${hour.id}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}-${turnoId}-${quarter}`;
          const teacherSlot = `${day.id}-${hour.id}-${teacherId}-${quarter}`;

          const isClassroomFree = !occupiedClassrooms.has(classroomSlot);
          const isPNFFree = !occupiedPNFs.has(pnfSlot);
          const isTeacherFree = !occupiedTeachers.has(teacherSlot);

          if (isClassroomFree && isPNFFree && isTeacherFree) {
            selectedDay = day.id;
            selectedHour = hour.id;
            selectedClassroom = classroom.id;
            assigned = true;
            break outerLoop; // Se encontró un slot para empezar la secuencia, salir de los bucles
          }
        }
      }
    }

    if (!assigned) {
      console.warn(`No hay horario disponible para: ${subject.subject}`);
      continue;
    }

    // Registrar asignación
    const subjectDayKey = `${subject.id}-${selectedDay}`;
    const existingHours = subjectDayAssignments.get(subjectDayKey) || [];
    existingHours.push(selectedHour);
    subjectDayAssignments.set(subjectDayKey, existingHours);

    // Registrar el aula para esta materia en este día, si es la primera hora asignada
    if (!subjectClassroomPerDay.has(subjectDayKey)) {
      subjectClassroomPerDay.set(subjectDayKey, selectedClassroom);
    }

    // Reservar recursos
    const classroomSlot = `${selectedDay}-${selectedHour}-${selectedClassroom}-${quarter}`;
    const pnfSlot = `${selectedDay}-${selectedHour}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}-${turnoId}-${quarter}`;
    const teacherSlot = `${selectedDay}-${selectedHour}-${teacherId}-${quarter}`;
    const subjectDayHourKey = `${subject.id}-${selectedDay}-${selectedHour}`;

    occupiedClassrooms.add(classroomSlot);
    occupiedPNFs.add(pnfSlot);
    occupiedTeachers.add(teacherSlot);
    subjectDayHourAssignments.add(subjectDayHourKey);

    // Actualizar contador de horas
    const currentCount = subjectHoursPerDay.get(subjectDayKey) || 0;
    subjectHoursPerDay.set(subjectDayKey, currentCount + 1);

    scheduleData.push({
      classroom_id: selectedClassroom,
      day_id: selectedDay,
      hours_id: selectedHour,
      subject_id: subject.id,
      teacher_id: teacherId,
      turn_id: turnoId,
      trayecto_id: subject.trayectoId,
      pnf_id: subject.pnfId,
      seccion: subject.seccion,
      quarter: quarter,
    });
  }

  return scheduleData;
}

