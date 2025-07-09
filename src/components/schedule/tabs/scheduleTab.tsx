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

  function normalizeTeacherName(teacherName: string): string {
    // 1. Convertir todo el nombre a minúsculas
    const lowerCaseName = teacherName.toLowerCase();

    // 2. Dividir el nombre en palabras usando el espacio como delimitador
    const words = lowerCaseName.split(" ");

    // 3. Capitalizar la primera letra de cada palabra
    const capitalizeWords = words.map((word) => {
      // Si la palabra está vacía (por ejemplo, doble espacio), retornarla como está
      if (word.length === 0) {
        return "";
      }
      // Capitalizar la primera letra y añadir el resto de la palabra
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

    // 4. Unir las palabras capitalizadas de nuevo en una sola cadena
    return capitalizeWords.join(" ");
  }

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
                const teacherName = normalizeTeacherName(cellData?.teacher || "");
                const rowStyle: React.CSSProperties = {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100px",
                };
                return (
                  <td key={key} id={key}>
                    {cellData ? (
                      <div style={rowStyle}>
                        <span style={{ fontWeight: "bold" }}>{cellData.subject}</span>
                        <span style={{ fontSize: "0.9em", textAlign: "center" }}>{teacherName}</span>
                        <span style={{ fontSize: "0.8em", textAlign: "center" }}>{cellData.classroom}</span>
                      </div>
                    ) : (
                      <div style={rowStyle}>vacio</div>
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

