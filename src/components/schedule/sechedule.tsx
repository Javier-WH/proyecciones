import { Tabs } from "antd";
import type { TabsProps } from "antd";
import ScheduleTab from "./tabs/scheduleTab";
import { useContext } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Subject } from "../../interfaces/subject";
import { Teacher } from "../../interfaces/teacher";
import { Turno } from "../../interfaces/turnos";

export interface ScheduleCommonData {
  subjects: Subject[] | null;
  teachers: Teacher[] | null;
  turnos: Turno[] | null;
}

export default function Schedule() {
  const { teachers, subjects, turnosList } = useContext(MainContext) as MainContextValues;

  const onChange = (key: string) => {
    console.log(key);
  };

  const scheduleComonValues: ScheduleCommonData = {
    subjects,
    teachers,
    turnos: turnosList,
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
      children: "Content of Tab Pane 2",
    },
    {
      key: "3",
      label: "Configuración",
      children: "Content of Tab Pane 3",
    },
  ];
  return <Tabs style={{ marginLeft: "20px" }} defaultActiveKey="1" items={items} onChange={onChange} />;
}

