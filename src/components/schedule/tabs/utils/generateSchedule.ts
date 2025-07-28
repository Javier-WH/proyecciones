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
  // Opcional, si se quiere controlar horas máximas por materia
}

/**
 * Genera un horario de materias, asignando las materias a los profesores y aulas disponibles.
 * @param schedule Horario existente para no chocar con el nuevo horario que se va a generar.
 * @param filteredSubjects Materias a asignar.
 * @param turnos Turnos disponibles.
 * @param filteredDays Días disponibles.
 * @param filteredHours Horas disponibles.
 * @param classrooms Aulas disponibles.
 * @param quarter Cuatrimestre a considerar (q1, q2 o q3).
 * @returns Un arreglo de horarios generados, cada item es un objeto con los campos:
 *  - classroom_id: Identificador de la aula asignada.
 *  - day_id: Identificador del día asignado.
 *  - hours_id: Identificador de la hora asignada.
 *  - subject_id: Identificador de la materia asignada.
 *  - teacher_id: Identificador del profesor asignado.
 *  - turn_id: Identificador del turno asignado.
 *  - trayecto_id: Identificador del trayecto asignado.
 *  - pnf_id: Identificador del PNF asignado.
 *  - seccion: Sección asignada.
 *  - quarter: Cuatrimestre asignado (1, 2 o 3).
 */
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
  const scheduleData = [];
  const subjectDayHourAssignments = new Set<string>(); // Evita misma materia mismo día misma hora
  const subjectHoursPerDay = new Map<string, number>(); // Controla horas por día por materia
  const subjectClassroomPerDay = new Map<string, string>(); // Controla aula por materia y día

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
    }
  }

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

    outerLoop: for (const day of filteredDays) {
      // Verificar límite de horas por día (máx 3)
      if (getSubjectDayCount(day.id) >= maxHoursPerDay) {
        continue; // Saltar este día si ya tiene 3 horas
      }

      // Determinar aula permitida para esta materia en este día
      const subjectDayKey = `${subject.id}-${day.id}`;
      const allowedClassroomId = subjectClassroomPerDay.get(subjectDayKey);
      const classroomsToCheck = allowedClassroomId
        ? classrooms.filter((c) => c.id === allowedClassroomId)
        : classrooms;

      // Verificar si hay aulas disponibles
      if (classroomsToCheck.length === 0) continue;

      for (const hour of filteredHours) {
        // Evitar misma materia mismo día misma hora
        const subjectDayHourKey = `${subject.id}-${day.id}-${hour.id}`;
        if (subjectDayHourAssignments.has(subjectDayHourKey)) {
          continue; // Ya existe asignación para esta combinación
        }

        for (const classroom of classroomsToCheck) {
          const classroomSlot = `${day.id}-${hour.id}-${classroom.id}-${quarter}`;
          const pnfSlot = `${day.id}-${hour.id}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}-${turnoId}-${quarter}`;
          const teacherSlot = `${day.id}-${hour.id}-${teacherId}-${quarter}`;

          const isClassroomFree = !occupiedClassrooms.has(classroomSlot);
          const isPNFFree = !occupiedPNFs.has(pnfSlot);
          const isTeacherFree = !occupiedTeachers.has(teacherSlot);

          if (isClassroomFree && isPNFFree && isTeacherFree) {
            // Reservar recursos
            occupiedClassrooms.add(classroomSlot);
            occupiedPNFs.add(pnfSlot);
            occupiedTeachers.add(teacherSlot);
            subjectDayHourAssignments.add(subjectDayHourKey);
            subjectHoursPerDay.set(`${subject.id}-${day.id}`, getSubjectDayCount(day.id) + 1);

            // Registrar aula usada si es primera hora del día
            if (!allowedClassroomId) {
              subjectClassroomPerDay.set(subjectDayKey, classroom.id);
            }

            selectedDay = day.id;
            selectedHour = hour.id;
            selectedClassroom = classroom.id;
            assigned = true;
            break outerLoop;
          }
        }
      }
    }

    if (!assigned) {
      console.warn(`No hay horario disponible para: ${subject.subject}`);
      continue;
    }

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

