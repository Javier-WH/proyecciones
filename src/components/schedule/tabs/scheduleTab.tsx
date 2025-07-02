import { Button, message } from "antd";
import { InsertSchedule, getDays, getHours, getClassrooms } from "../../../fetch/schedule/scheduleFetch";
import { ScheduleItem } from "../scheduleInterfaces";
import { ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";

interface Days {
  id: string;
  index: number;
  day: string;
}

interface Hours {
  id: string;
  index: number;
  hour: string;
}

interface Classroom {
  id: string;
  classroom: string;
}

export default function ScheduleTab({ data }: { data: ScheduleCommonData }) {
  const { subjects, teachers, turnos } = data;

  const [days, setDays] = useState<Days[]>([]);
  const [hours, setHours] = useState<Hours[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  const loadInitialData = async () => {
    const daysData = await getDays();
    if (daysData.error) return message.error(daysData.message);
    setDays(daysData);

    const hoursData = await getHours();
    if (hoursData.error) return message.error(hoursData.message);
    setHours(hoursData);

    const classroomsData = await getClassrooms();
    if (classroomsData.error) return message.error(classroomsData.message);
    setClassrooms(classroomsData);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleGenerateSchedule = async () => {
    if (
      !subjects ||
      !teachers ||
      !turnos ||
      subjects.length === 0 ||
      teachers.length === 0 ||
      days.length === 0 ||
      hours.length === 0 ||
      classrooms.length === 0 ||
      turnos.length === 0
    ) {
      return;
    }

    const scheduleData: ScheduleItem[] = [];
    const asignedClassrooms: string[] = []; // las aulas de clase ocupadas ese dia a esa hora
    const asignedHours: string[] = []; // las horas asignadas a un profesor ese dia
    const asignedSubjects: string[] = []; // las materias que ya ha sido asignadas

    for (const subject of subjects) {
      const turno = turnos.find((t) => t.name === subject.turnoName);
      // que la materia no esté ya asignada
      const newSubjectKey = subject.id + subject.seccion + subject.trayectoId + turno?.id + subject.pnfId;
      if (asignedSubjects.includes(newSubjectKey)) {
        continue;
      } else {
        asignedSubjects.push(newSubjectKey);
      }
      for (const day of days) {
        for (const hour of hours) {
          for (const classroom of classrooms) {
            // que el aula de clase no este ocupada ese dia a esa hora
            const newClassroomKey = hour.id + day.id + classroom.id;
            if (asignedClassrooms.includes(newClassroomKey)) {
              continue;
            } else {
              asignedClassrooms.push(newClassroomKey);
            }
            // que el profesor no este ocupado ese dia a esa hora
            const newHourKey = hour.id + day.id + subject.quarter.q1;
            if (asignedHours.includes(newHourKey)) {
              continue;
            } else {
              asignedHours.push(newHourKey);
            }

            const scheduleIem: ScheduleItem = {
              hours_id: hour.id,
              teacher_id: subject.quarter.q1 || "",
              day_id: day.id,
              subject_id: subject.id,
              classroom_id: classroom.id,
              seccion: subject.seccion || "",
              trayecto_id: subject.trayectoId,
              turn_id: turno?.id || "",
              pnf_id: subject.pnfId,
            };
            scheduleData.push(scheduleIem);
          }
        }
      }
    }

    const schedule = await InsertSchedule(scheduleData);
    if (schedule.error) {
      message.error(schedule.message.error);
      console.error(schedule);
      return;
    }
    message.success("Horario creado correctamente");
  };
  return (
    <div>
      <Button type="primary" onClick={handleGenerateSchedule}>
        Generar horario
      </Button>
    </div>
  );
}

