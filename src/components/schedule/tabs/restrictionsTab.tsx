import { Button, message } from "antd";
import { Days, Hours, ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";
import { Subject } from "../../../interfaces/subject";
import SaveSchedule from "./utils/saveSchedule";
import { splitSubjectsByQuarter } from "./utils/SubjectArraysFunctions";
import { generateSchedule } from "./utils/generateSchedule";
import { deleteSchedule } from "../../../fetch/schedule/scheduleFetch";

export default function RestrictionsTab({ data }: { data: ScheduleCommonData }) {
  const { subjects, teachers, turnos, days, hours, classrooms, schedule, loadInitialData } = data;
  ///

  /////
  const [filteredHours, setFilteredHours] = useState<Hours[]>([]);
  const [filteredDays, setFilteredDays] = useState<Days[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [quarter /*setQuarter*/] = useState<"q1" | "q2" | "q3">("q1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hours || hours.length === 0 || !days || days.length === 0 || !subjects || subjects?.length === 0)
      return;
    // limita las horas del horario a la mañana
    const filteredHours = hours.filter((hour) => hour.index >= 1 && hour.index <= 7);
    // limita las dias del horario a lunes a viernes
    const filteredDays = days.filter((day) => day.index >= 1 && day.index <= 5);
    setFilteredDays(filteredDays);
    setFilteredHours(filteredHours);
    const filteredSubjects = splitSubjectsByQuarter(subjects, quarter); //divide las materias por horas
    setFilteredSubjects(filteredSubjects);
  }, [hours, days, quarter]);

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
    setLoading(true);
    await deleteSchedule();
    await loadInitialData();
    const scheduleData = generateSchedule({
      schedule,
      filteredSubjects,
      turnos,
      filteredDays,
      filteredHours,
      classrooms,
      quarter,
    });

    const resposeSaveSchedule = await SaveSchedule(scheduleData, subjects);
    if (resposeSaveSchedule.error) {
      setLoading(false);
      message.error(resposeSaveSchedule.message);
      return;
    }
    setLoading(false);
    message.success(resposeSaveSchedule.message);
    loadInitialData();
  };

  if (loading) return <p>Generando horario...</p>;

  return (
    <div>
      <Button type="primary" onClick={handleGenerateSchedule}>
        Generar horario
      </Button>

      <Button
        type="primary"
        danger
        onClick={() => {
          deleteSchedule();
        }}>
        Borrar horario
      </Button>
    </div>
  );
}

