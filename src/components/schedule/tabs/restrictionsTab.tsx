import { Button, message } from "antd";
import { Days, Hours, ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";
import { InlineHours, Subject } from "../../../interfaces/subject";

interface GroupedSubjects {
  [pnf: string]: {
    [seccion: string]: Subject[];
  };
}

export default function RestrictionsTab({ data }: { data: ScheduleCommonData }) {
  const { subjects, teachers, turnos, days, hours, classrooms, InsertSchedule, loadInitialData } = data;
  const [filteredHours, setFilteredHours] = useState<Hours[]>([]);
  const [filteredDays, setFilteredDays] = useState<Days[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!hours || hours.length === 0 || !days || days.length === 0 || !subjects || subjects?.length === 0)
      return;
    const filteredHours = hours.filter((hour) => hour.index >= 1 && hour.index <= 7);
    const filteredDays = days.filter((day) => day.index >= 1 && day.index <= 5);
    console.log(filteredDays);
    setFilteredDays(filteredDays);
    setFilteredHours(filteredHours);
    const filteredSubjects = splitSubjectsByQuarter(subjects, "q1");
    setFilteredSubjects(filteredSubjects);
  }, [hours, days]);

  const handleGenerateSchedule = async () => {
    if (
      !subjects ||
      !teachers ||
      !turnos ||
      !days ||
      !hours ||
      !filteredHours ||
      !classrooms ||
      !filteredSubjects ||
      subjects.length === 0 ||
      teachers.length === 0 ||
      days.length === 0 ||
      hours.length === 0 ||
      filteredHours.length === 0 ||
      classrooms.length === 0 ||
      filteredSubjects.length === 0 ||
      turnos.length === 0
    ) {
      message.warning("Faltan datos necesarios para generar el horario");
      return;
    }

    const occupiedClassrooms = new Set<string>(); // Un alula de clases no puede estar ocupada en el mismo horario. Formato: "dia-hora-aula"
    const occupiedPNFs = new Set<string>(); //Un PNF no puede ver dos clases el mismo dia a la misma hora. Formato: "dia-hora-pnfId-trayectoId"
    const occupiedTeachers = new Set<string>(); //Un profesor no puede dar dos clases el mismo dia a la misma hora. Formato: "dia-hora-teacherId"
    //const occupiedSubjectCombos = new Set<string>(); //No se puede asignar una materia de una secccion, trayecto, turno y programa dos veces. Formato: "subject_id-seccion-trayecto_id-turn_id-pnf_id"
    const scheduleData = [];

    for (const subject of filteredSubjects) {
      let assigned = false;
      let selectedDay = "";
      let selectedHour = "";
      let selectedClassroom = "";

      const turnoId =
        turnos.find((turno) => turno.name.toLowerCase() === subject.turnoName.toLowerCase())?.id || null;
      const teacherId = subject?.quarter?.q1 || null;

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
      });
    }

    try {
      const response = await InsertSchedule(scheduleData);
      if (response.error) {
        console.error("Detalles del error:", response.message);
        message.error(`Error: ${response.message.message}`);
        return;
      }
      // await loadInitialData();
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

//separa las materias por horas individuales
function splitSubjectsByQuarter(subjects: Subject[], quarter: keyof InlineHours): Subject[] {
  const result: Subject[] = [];

  for (const subject of subjects) {
    // Obtener la cantidad de horas para el trimestre especificado
    const hoursCount = subject.hours[quarter] || 0;

    // Si no hay horas para este trimestre, saltar esta materia
    if (hoursCount <= 0) continue;

    // Crear n copias de la materia, una por cada hora
    for (let i = 1; i <= hoursCount; i++) {
      const clonedSubject: Subject = {
        ...subject,
        innerId: `${subject.innerId}-${quarter}-${i}`,
        hours: {
          ...subject.hours,
          [quarter]: 1, // Cada copia representa 1 hora
        },
      };

      // Actualizar la clave si existe
      if (clonedSubject.key) {
        clonedSubject.key = `${clonedSubject.key}-${quarter}-${i}`;
      }

      result.push(clonedSubject);
    }
  }

  return result;
}

//agrupa las materias por pnf y seccion
function groupSubjectsByPnfAndSeccion(subjects: Subject[]): GroupedSubjects {
  const grouped: GroupedSubjects = {};

  for (const subject of subjects) {
    const { pnf, seccion } = subject;

    // Crear grupo para el PNF si no existe
    if (!grouped[pnf]) {
      grouped[pnf] = {};
    }

    // Crear grupo para la sección si no existe
    if (!grouped[pnf][seccion]) {
      grouped[pnf][seccion] = [];
    }

    // Agregar asignatura al grupo
    grouped[pnf][seccion].push(subject);
  }

  return grouped;
}

