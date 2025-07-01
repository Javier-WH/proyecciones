import { Tabs } from "antd";
import type { TabsProps } from "antd";
import ScheduleTab from "./tabs/scheduleTab";

const onChange = (key: string) => {
  console.log(key);
};

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Horarios",
    children: <ScheduleTab />,
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

export default function Schedule() {
  return <Tabs style={{ marginLeft: "20px" }} defaultActiveKey="1" items={items} onChange={onChange} />;
}

