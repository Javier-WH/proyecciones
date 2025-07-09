import { Days, ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";
import "./scheduleTable.css";

export default function ScheduleTab({ data }: { data: ScheduleCommonData }) {
  const { schedule: scheduleRawData, hours, turnos, days: daysData, classrooms, subjects, teachers } = data;

  const [days, setDays] = useState<Days[]>([]);

  useEffect(() => {
    if (!scheduleRawData || scheduleRawData.length === 0) return;
    //console.log(scheduleRawData);
  }, [scheduleRawData]);

  useEffect(() => {
    if (!daysData || daysData.length === 0) return;
    const orderedDays = daysData.sort((a: Days, b: Days) => a.index - b.index);
    setDays(orderedDays);
    // excluir sabados y domingos
    /*const filteredDays = orderedDays.filter((day) => day.index !== 6 && day.index !== 7);
    setDays(filteredDays);*/
  }, [daysData]);

  const getCellData = (hourId: string, dayId: string) => {
    const cellData = scheduleRawData.find((item) => item.day_id == dayId && item.hours_id == hourId);

    if (!cellData) return null;
    const subject = subjects?.find((subject) => subject.id === cellData.subject_id)?.subject;
    const classroom = classrooms?.find((classroom) => classroom.id === cellData.classroom_id)?.classroom;
    const turn = turnos?.find((turno) => turno.id === cellData.turn_id)?.name;
    const teacher = teachers?.find((teacher) => teacher.id === cellData.teacher_id);
    return { subject, classroom, turn, teacher: teacher?.name + " " + teacher?.lastName };
  };

  return (
    <div>
      <table className="schedule-table">
        <thead>
          <tr>
            <th></th>
            {days?.map((day) => (
              <th key={day.id}>{day.day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours?.map((hour) => (
            <tr key={hour.id}>
              <th>{hour.hours}</th>
              {days?.map((day) => {
                const key = `${hour.id}-${day.id}`;
                const cellData = getCellData(hour.id, day.id);
                return (
                  <td key={key} id={key}>
                    {cellData ? (
                      <>
                        <div className="subject">{cellData.subject}</div>
                        <div className="teacher">{cellData.teacher}</div>
                        <div className="classroom">{cellData.classroom}</div>
                        <div className="turn">{cellData.turn}</div>
                      </>
                    ) : (
                      <div>vacio</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

