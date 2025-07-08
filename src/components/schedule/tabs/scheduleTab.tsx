import { ScheduleCommonData } from "../sechedule";
import { useEffect } from "react";

export default function ScheduleTab({ data }: { data: ScheduleCommonData }) {
  const { schedule: scheduleRawData, hours, turnos, days, classrooms } = data;

  useEffect(() => {
    if (!scheduleRawData || scheduleRawData.length === 0) return;
    console.log(days);
  }, [scheduleRawData]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            {days?.map((day) => (
              <th key={day.id}>{day.day}</th>
            ))}
          </tr>
        </thead>
      </table>
    </div>
  );
}

