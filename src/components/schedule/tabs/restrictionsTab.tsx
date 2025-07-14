import { Button, message } from "antd";
import { ScheduleCommonData } from "../sechedule";

export default function RestrictionsTab({ data }: { data: ScheduleCommonData }) {
  const { subjects, teachers, turnos, days, hours, classrooms, InsertSchedule } = data;

  const handleGenerateSchedule = async () => {
    if (
      !subjects ||
      !teachers ||
      !turnos ||
      !days ||
      !hours ||
      !classrooms ||
      subjects.length === 0 ||
      teachers.length === 0 ||
      days.length === 0 ||
      hours.length === 0 ||
      classrooms.length === 0 ||
      turnos.length === 0
    ) {
      message.warning("Faltan datos necesarios para generar el horario");
      return;
    }

    const occupiedClassrooms = new Set<string>(); // Un alula de clases no puede estar ocupada en el mismo horario. Formato: "dia-hora-aula"
    const occupiedPNFs = new Set<string>(); //Un PNF no puede ver dos clases el mismo dia a la misma hora. Formato: "dia-hora-pnfId-trayectoId"
    const occupiedTeachers = new Set<string>(); //Un profesor no puede dar dos clases el mismo dia a la misma hora. Formato: "dia-hora-teacherId"
    const occupiedSubjectCombos = new Set<string>(); //No se puede asignar una materia de una secccion, trayecto, turno y programa dos veces. Formato: "subject_id-seccion-trayecto_id-turn_id-pnf_id"
    const scheduleData = [];

    for (const subject of subjects) {
      let assigned = false;
      let selectedDay = "";
      let selectedHour = "";
      let selectedClassroom = "";

      const turnoId =
        turnos.find((turno) => turno.name.toLowerCase() === subject.turnoName.toLowerCase())?.id || null;
      const teacherId = subject?.quarter?.q1 || null;
      const subjectComboKey = `${subject.id}-${subject.seccion}-${subject.trayectoId}-${turnoId}-${subject.pnfId}`;

      if (!teacherId || !turnoId) {
        continue;
      }

      if (occupiedSubjectCombos.has(subjectComboKey)) {
        console.warn(`Combinación única ya ocupada para: ${subject.subject}`);
        continue;
      }

      outerLoop: for (const day of days) {
        for (const hour of hours) {
          for (const classroom of classrooms) {
            const classroomSlot = `${day.id}-${hour.id}-${classroom.id}`;
            const pnfSlot = `${day.id}-${hour.id}-${subject.pnfId}-${subject.trayectoId}`;
            const teacherSlot = `${day.id}-${hour.id}-${teacherId}`;

            const isClassroomFree = !occupiedClassrooms.has(classroomSlot);
            const isPNFFree = !occupiedPNFs.has(pnfSlot);
            const isTeacherFree = !occupiedTeachers.has(teacherSlot);

            if (isClassroomFree && isPNFFree && isTeacherFree) {
              // Reservar recursos
              occupiedClassrooms.add(classroomSlot);
              occupiedPNFs.add(pnfSlot);
              occupiedTeachers.add(teacherSlot);
              occupiedSubjectCombos.add(subjectComboKey);

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
      });
    }

    try {
      const response = await InsertSchedule(scheduleData);
      if (response.error) {
        console.error("Detalles del error:", response.message);
        message.error(`Error: ${response.message}`);
        return;
      }
      message.success(`Horario generado con ${scheduleData.length}/${subjects.length} materias asignadas`);
    } catch (error) {
      console.error("Error completo:", error);
      message.error("Error crítico al generar el horario");
    }
  };

  return (
    <div>
      <Button type="primary" onClick={handleGenerateSchedule}>
        Generar horario
      </Button>
    </div>
  );
}

