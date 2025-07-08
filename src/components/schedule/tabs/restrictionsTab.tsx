import { Button, message } from "antd";
import { ScheduleItem } from "../scheduleInterfaces";
import { ScheduleCommonData } from "../sechedule";
import { Subject } from "../../../interfaces/subject";

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

    const scheduleData: ScheduleItem[] = [];
    const busyTeacherSlots = new Set<string>(); // Formato: teacherId-dayId-hourId
    const busyClassroomSlots = new Set<string>(); // Formato: classroomId-dayId-hourId
    const assignedSubjects = new Set<string>(); // Materias ya asignadas

    // 1. Filtrar solo materias con profesor asignado en q1
    const q1Subjects = subjects.filter(
      (subject) => subject.quarter?.q1 && teachers.some((t) => t.id === subject.quarter.q1)
    );

    // 2. Ordenar por cantidad de horas requeridas (si está disponible)
    q1Subjects.sort((a, b) => {
      const hoursA = a.hours.q1 || 0;
      const hoursB = b.hours.q1 || 0;
      return hoursB - hoursA; // Materias con más horas primero
    });

    // 3. Función para encontrar slot disponible
    const findAvailableSlot = (teacherId: string) => {
      for (const day of days) {
        // aqui van las restricciones de dias

        for (const hour of hours) {
          // aqui van las restricciones de horas

          const teacherKey = `${teacherId}-${day.id}-${hour.id}`;

          // Verificar si el profesor ya está ocupado
          if (busyTeacherSlots.has(teacherKey)) continue;

          // Buscar aula disponible para este slot
          for (const classroom of classrooms) {
            const classroomKey = `${classroom.id}-${day.id}-${hour.id}`;

            if (!busyClassroomSlots.has(classroomKey)) {
              return { day, hour, classroom };
            }
          }
        }
      }
      return null; // No hay slots disponibles
    };

    // 4. Asignar materias
    for (const subject of q1Subjects) {
      const teacherId = subject.quarter.q1!;
      const turno = turnos.find((t) => t.name === subject.turnoName);
      if (!turno) continue;

      const subjectKey = getSubjectKey({ subject });
      if (assignedSubjects.has(subjectKey)) continue;

      // Buscar slot disponible
      const slot = findAvailableSlot(teacherId);
      if (!slot) {
        console.warn(`No hay slots disponibles para: ${subject.subject}`);
        continue;
      }

      // Crear registro de horario
      const scheduleItem: ScheduleItem = {
        hours_id: slot.hour.id,
        teacher_id: teacherId,
        day_id: slot.day.id,
        subject_id: subject.id,
        classroom_id: slot.classroom.id,
        seccion: subject.seccion,
        trayecto_id: subject.trayectoId,
        turn_id: turno.id,
        pnf_id: subject.pnfId,
      };

      // Registrar asignación
      scheduleData.push(scheduleItem);
      busyTeacherSlots.add(`${teacherId}-${slot.day.id}-${slot.hour.id}`);
      busyClassroomSlots.add(`${slot.classroom.id}-${slot.day.id}-${slot.hour.id}`);
      assignedSubjects.add(subjectKey);
    }

    // 5. Insertar en la base de datos
    try {
      const schedule = await InsertSchedule(scheduleData);
      if (schedule.error) {
        const error = schedule.message.message;
        const [messaje, fileds] = error.split(":");
        console.log({ messaje, fileds }); // tengo que crear un manejo de erores mas adecuado

        message.error(`Error: ${schedule.message.error}`);

        console.error("Detalles del error:", schedule);
      } else {
        message.success(`Horario generado: ${scheduleData.length} clases asignadas`);
      }
    } catch (error) {
      console.error("Error inesperado:", error);
      message.error("Error al guardar el horario");
    }
  };

  // Función de clave única para materias
  function getSubjectKey({ subject }: { subject: Subject }): string {
    return `${subject.id}-${subject.seccion}-${subject.trayectoId}-${subject.pnfId}`;
  }

  return (
    <div>
      <Button type="primary" onClick={handleGenerateSchedule}>
        Generar horario
      </Button>
    </div>
  );
}

