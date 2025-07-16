import { Button, message } from "antd";
import { Days, Hours, ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";
import { Subject } from "../../../interfaces/subject";
import SaveSchedule from "./utils/saveSchedule";
import { splitSubjectsByQuarter } from "./utils/SubjectArraysFunctions";

export default function RestrictionsTab({ data }: { data: ScheduleCommonData }) {
  const { subjects, teachers, turnos, days, hours, classrooms, schedule, loadInitialData } = data;
  const [filteredHours, setFilteredHours] = useState<Hours[]>([]);
  const [filteredDays, setFilteredDays] = useState<Days[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!hours || hours.length === 0 || !days || days.length === 0 || !subjects || subjects?.length === 0)
      return;
    // limita las horas del horario a la mañana
    const filteredHours = hours.filter((hour) => hour.index >= 1 && hour.index <= 7);
    // limita las dias del horario a lunes a viernes
    const filteredDays = days.filter((day) => day.index >= 1 && day.index <= 5);
    setFilteredDays(filteredDays);
    setFilteredHours(filteredHours);
    //agrego filtro temporal para que solo aparezcan las materias del pnf en administracion, seccion 1, primer trayecto, turno manana
    /* const gropedSubjects = subjects.filter(
      (item) =>
        item.pnfId === "00635193-cb18-4e16-93c3-87506b07a0f3" &&
        item.trayectoId === "16817025-cd37-41e7-8d2b-5db381c7a725" &&
        item.turnoName === "Mañana" &&
        item.seccion === "1"
    );*/

    //separo las horas agrupadas en horas individuales
    // const filteredSubjects = splitSubjectsByQuarter(gropedSubjects, "q1");
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
            const classroomSlot = `${day.id}-${hour.id}-${classroom.id}-${
              subject.quarter?.q1 ? 1 : subject.quarter?.q2 ? 2 : 3
            }`;
            const pnfSlot = `${day.id}-${hour.id}-${subject.pnfId}-${subject.trayectoId}-${
              subject.seccion
            }-${turnoId}${subject.quarter?.q1 ? 1 : subject.quarter?.q2 ? 2 : 3}`;
            const teacherSlot = `${day.id}-${hour.id}-${teacherId}${
              subject.quarter?.q1 ? 1 : subject.quarter?.q2 ? 2 : 3
            }`;

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
        quarter: subject.quarter.q1 ? "1" : subject.quarter.q2 ? "2" : "3",
      });
    }

    const resposeSaveSchedule = await SaveSchedule(scheduleData, subjects);
    if (resposeSaveSchedule.error) {
      message.error(resposeSaveSchedule.message);
      return;
    }
    message.success(resposeSaveSchedule.message);
    loadInitialData();
  };

  return (
    <div>
      <Button type="primary" onClick={handleGenerateSchedule}>
        Generar horario
      </Button>
    </div>
  );
}

