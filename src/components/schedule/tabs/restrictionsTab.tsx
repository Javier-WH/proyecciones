import { Button, message } from "antd";
import { Days, Hours, ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";
import { Subject } from "../../../interfaces/subject";
import SaveSchedule from "./utils/saveSchedule";
import { splitSubjectsByQuarter } from "./utils/SubjectArraysFunctions";
import { generateSchedule } from "./utils/generateSchedule";

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

    const scheduleData = generateSchedule({
      schedule,
      filteredSubjects,
      turnos,
      filteredDays,
      filteredHours,
      classrooms,
      quarter: "q1",
    });
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

