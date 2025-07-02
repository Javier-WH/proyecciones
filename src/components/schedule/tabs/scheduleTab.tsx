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
  const { subjects, teachers } = data;

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
      subjects.length === 0 ||
      teachers.length === 0 ||
      days.length === 0 ||
      hours.length === 0 ||
      classrooms.length === 0
    ) {
      return;
    }

    const schedule: ScheduleItem[] = [];

    for (const day of days) {
      for (const hour of hours) {
        for (const classroom of classrooms) {
          for (const subject of subjects) {
            const scheduleIem: ScheduleItem = {
              hours_id: hour.id,
              teacher_id: subject.quarter.q1 || "",
              day_id: day.id,
              subject_id: subject.id,
              classroom_id: classroom.id,
              seccion: subject.seccion || "",
              trayecto_id: subject.trayectoId,
              turn_id: subject.turnoName, // hay que buscar el id
              pnf_id: subject.pnfId,
            };
            schedule.push(scheduleIem);
          }
        }
      }
    }
    console.log(schedule);
    return;
    const testData: ScheduleItem[] = [
      {
        hours_id: "b4b33b9a-787a-49a6-8c4e-a2a59ca2b46f",
        teacher_id: "00ac3ed9-bb44-4adf-b6f8-a51ccf12d097",
        day_id: "2b098350-f552-4fbb-ae40-65b46dadd932",
        subject_id: "000af8b4-96cc-4dbe-b3c9-0b6e188600a4",
        classroom_id: "65895923-45b8-41dd-9ff2-a849f58056ea",
        seccion: "1",
        trayecto_id: "16817025-cd37-41e7-8d2b-5db381c7a725",
        turn_id: "5df454ed-2874-4d14-a74b-115f4d2c3463",
        pnf_id: "00635193-cb18-4e16-93c3-87506b07a0f3",
      },
    ];
    const schedule = await InsertSchedule(testData);
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

