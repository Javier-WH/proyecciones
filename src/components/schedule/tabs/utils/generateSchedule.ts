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
}: GenerateScheduleProps): GenerateScheduleResponse[] {
  const occupiedClassrooms = new Set<string>(); // Un alula de clases no puede estar ocupada en el mismo horario. Formato: "dia-hora-aula"
  const occupiedPNFs = new Set<string>(); //Un PNF no puede ver dos clases el mismo dia a la misma hora. Formato: "dia-hora-pnfId-trayectoId"
  const occupiedTeachers = new Set<string>(); //Un profesor no puede dar dos clases el mismo dia a la misma hora. Formato: "dia-hora-teacherId"
  //const occupiedSubjectCombos = new Set<string>(); //No se puede asignar una materia de una secccion, trayecto, turno y programa dos veces. Formato: "subject_id-seccion-trayecto_id-turn_id-pnf_id"
  const scheduleData = [];

  // carga las horas que estan ocupadas desde la base de datos
  if (schedule.length > 0) {
    for (const scheduleItem of schedule) {
      occupiedClassrooms.add(
        `${scheduleItem.day_id}-${scheduleItem.hours_id}-${scheduleItem.classroom_id}-${scheduleItem.quarter}`
      );

      occupiedPNFs.add(
        `${scheduleItem.day_id}-${scheduleItem.hours_id}-${scheduleItem.pnf_id}-${scheduleItem.trayecto_id}-${scheduleItem.seccion}-${scheduleItem.turn_id}-${scheduleItem.quarter}`
      );
      occupiedTeachers.add(
        `${scheduleItem.day_id}-${scheduleItem.hours_id}-${scheduleItem.teacher_id}-${scheduleItem.quarter}`
      );
      //occupiedSubjectCombos.add(`${scheduleItem.subject_id}-${scheduleItem.seccion}-${scheduleItem.trayecto_id}-${scheduleItem.turn_id}-${scheduleItem.pnf_id}`);
    }
  }

  for (const subject of filteredSubjects) {
    let assigned = false;
    let selectedDay = "";
    let selectedHour = "";
    let selectedClassroom = "";

    if (!subject.quarter || !subject.quarter[quarter] === undefined) {
      console.warn(`Materia sin cuatrimestre asignado: ${subject.subject}`);
      continue;
    }

    const turnoId =
      turnos.find((turno) => turno.name.toLowerCase() === subject.turnoName.toLowerCase())?.id || null;
    const teacherId = subject?.quarter?.[quarter] || null;

    if (!teacherId || !turnoId) {
      continue;
    }

    /*const subjectComboKey = `${subject.id}-${subject.seccion}-${subject.trayectoId}-${turnoId}-${subject.pnfId}`;
      if (occupiedSubjectCombos.has(subjectComboKey)) {
        console.warn(`Combinación única ya ocupada para: ${subject.subject}`);
        continue;
      }*/

    outerLoop: for (const day of filteredDays) {
      for (const hour of filteredHours) {
        for (const classroom of classrooms) {
          const classroomSlot = `${day.id}-${hour.id}-${classroom.id}-${quarter}`;
          const pnfSlot = `${day.id}-${hour.id}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}-${turnoId}-${quarter}`;
          const teacherSlot = `${day.id}-${hour.id}-${teacherId}${quarter}`;

          const isClassroomFree = !occupiedClassrooms.has(classroomSlot);
          const isPNFFree = !occupiedPNFs.has(pnfSlot);
          const isTeacherFree = !occupiedTeachers.has(teacherSlot);

          if (isClassroomFree && isPNFFree && isTeacherFree) {
            // Reservar recursos
            occupiedClassrooms.add(classroomSlot);
            occupiedPNFs.add(pnfSlot);
            occupiedTeachers.add(teacherSlot);
            //occupiedSubjectCombos.add(subjectComboKey);

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

