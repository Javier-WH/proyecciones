import { message, Tabs } from "antd";
import type { TabsProps } from "antd";
import RestrictionsTab from "./tabs/restrictionsTab";
import ScheduleTab from "./tabs/scheduleTab";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Subject } from "../../interfaces/subject";
import { Teacher } from "../../interfaces/teacher";
import { Turno } from "../../interfaces/turnos";
import {
  InsertSchedule,
  getDays,
  getHours,
  getClassrooms,
  getSchedule,
} from "../../fetch/schedule/scheduleFetch";
import { ScheduleItem } from "./scheduleInterfaces";

export interface ScheduleCommonData {
  subjects: Subject[] | null;
  teachers: Teacher[] | null;
  turnos: Turno[] | null;
  days: Days[] | null;
  hours: Hours[] | null;
  classrooms: Classroom[] | null;
  InsertSchedule: (schedule: ScheduleItem[]) => Promise<{ error: boolean; status: number; message: any }>;
  schedule: ScheduleItem[];
}

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

export default function Schedule() {
  const { teachers, subjects, turnosList } = useContext(MainContext) as MainContextValues;
  const [days, setDays] = useState<Days[]>([]);
  const [hours, setHours] = useState<Hours[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const loadInitialData = async () => {
    const daysData = await getDays();
    if (daysData.error) return message.error(daysData.message);
    const orderedDays = daysData.sort((a: Days, b: Days) => a.index - b.index);
    setDays(orderedDays);

    const hoursData = await getHours();
    if (hoursData.error) return message.error(hoursData.message);
    setHours(hoursData);

    const classroomsData = await getClassrooms();
    if (classroomsData.error) return message.error(classroomsData.message);
    setClassrooms(classroomsData);

    const scheduleData = await getSchedule();
    if (scheduleData.error) return message.error(scheduleData.message);
    setSchedule(scheduleData);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const onChange = (key: string) => {
    console.log(key);
  };

  const scheduleComonValues: ScheduleCommonData = {
    subjects,
    teachers,
    turnos: turnosList,
    days,
    hours,
    classrooms,
    InsertSchedule,
    schedule,
  };

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Horarios",
      children: <ScheduleTab data={scheduleComonValues} />,
    },
    {
      key: "2",
      label: "Restricciones",
      children: <RestrictionsTab data={scheduleComonValues} />,
    },
    {
      key: "3",
      label: "Configuración",
      children: "Content of Tab Pane 3",
    },
  ];
  return <Tabs style={{ marginLeft: "20px" }} defaultActiveKey="1" items={items} onChange={onChange} />;
}

