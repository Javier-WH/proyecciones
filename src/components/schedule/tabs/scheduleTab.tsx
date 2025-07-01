import { Button } from "antd";
import { InsertSchedule } from "../../../fetch/schedule/scheduleFetch";
import { ScheduleItem } from "../scheduleInterfaces";

export default function ScheduleTab() {
  const handleGenerateSchedule = async () => {
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
    console.log(schedule);
  };
  return (
    <div>
      <Button type="primary" onClick={handleGenerateSchedule}>
        Generar horario
      </Button>
    </div>
  );
}

