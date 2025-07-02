import { Tabs } from "antd";
import type { TabsProps } from "antd";
import ScheduleTab from "./tabs/scheduleTab";
import { useContext } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Subject } from "../../interfaces/subject";
import { Teacher } from "../../interfaces/teacher";

export interface ScheduleCommonData {
  subjects: Subject[] | null;
  teachers: Teacher[] | null;
}

export default function Schedule() {
  const { teachers, subjects } = useContext(MainContext) as MainContextValues;

  const onChange = (key: string) => {
    console.log(key);
  };

  const scheduleComonValues: ScheduleCommonData = {
    subjects,
    teachers,
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

