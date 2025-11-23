import React from "react";
import { turnos } from "./fucntions";

interface PrintableScheduleProps {
  events: any[];
  viewMode: "pnf" | "professor";
  turn: string;
  headerInfo: string;
}

const PrintableSchedule: React.FC<PrintableScheduleProps> = ({ events, viewMode, turn, headerInfo }) => {
  // Generate time slots based on view mode
  let timeSlots: string[] = [];

  if (viewMode === "professor") {
    // Generate slots from 07:00 to 21:15 in 45 min intervals
    const startHour = 7;
    const endHour = 21;
    const startMin = 0;

    let currentH = startHour;
    let currentM = startMin;

    while (currentH < endHour || (currentH === endHour && currentM < 15)) {
      const timeStr = `${currentH.toString().padStart(2, "0")}:${currentM.toString().padStart(2, "0")}`;
      timeSlots.push(timeStr);

      currentM += 45;
      if (currentM >= 60) {
        currentH += Math.floor(currentM / 60);
        currentM = currentM % 60;
      }
    }
  } else {
    // Use defined turnos
    const turnSlots = turnos[turn] || [];
    timeSlots = turnSlots.map(slot => slot[0]);
  }

  // Helper to format time for display
  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // Helper to get end time for a slot
  const getSlotEndTime = (startTime: string) => {
    const [h, m] = startTime.split(":").map(Number);
    let endM = m + 45;
    let endH = h;
    if (endM >= 60) {
      endH += Math.floor(endM / 60);
      endM = endM % 60;
    }
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  };

  // Map events to a grid for easier rendering
  // Grid: [timeSlotIndex][dayIndex] -> Event | null | 'occupied'
  const days = [1, 2, 3, 4, 5]; // Lunes to Viernes
  const grid: (any | null | 'occupied')[][] = Array(timeSlots.length).fill(null).map(() => Array(6).fill(null)); // 0 is unused, 1-5 are days

  events.forEach(event => {
    // Handle recurring events (daysOfWeek, startTime, endTime)
    if (event.daysOfWeek && event.startTime && event.endTime) {
      const startStr = event.startTime;
      const endStr = event.endTime;

      // Find start slot index
      const startIndex = timeSlots.findIndex(t => t === startStr);
      if (startIndex === -1) return;

      // Calculate duration in slots
      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      const diffMins = endMins - startMins;
      const span = Math.round(diffMins / 45);

      // Iterate over daysOfWeek
      event.daysOfWeek.forEach((day: number) => {
        // daysOfWeek: 1=Monday, 5=Friday. Matches our grid index 1-5.
        if (day >= 1 && day <= 5) {
          if (grid[startIndex][day] === null) {
            grid[startIndex][day] = { ...event, span };
            // Mark subsequent slots as occupied
            for (let i = 1; i < span; i++) {
              if (startIndex + i < timeSlots.length) {
                grid[startIndex + i][day] = 'occupied';
              }
            }
          }
        }
      });
    }
  });

  return (
    <div id="printable-schedule-container" style={{ display: "none" }}>
      <div id="printable-content" style={{ padding: "10px", fontFamily: "Arial, sans-serif", color: "#000" }}>
        <h2 style={{ textAlign: "center", textTransform: "uppercase", marginBottom: "5px", borderBottom: "2px solid #000", paddingBottom: "3px", fontSize: "0.85rem" }}>
          {headerInfo}
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", fontSize: "0.55rem" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #000", padding: "1px", width: "60px", fontSize: "0.6rem" }}>HORA</th>
              <th style={{ border: "1px solid #000", padding: "1px", fontSize: "0.6rem" }}>LUNES</th>
              <th style={{ border: "1px solid #000", padding: "1px", fontSize: "0.6rem" }}>MARTES</th>
              <th style={{ border: "1px solid #000", padding: "1px", fontSize: "0.6rem" }}>MIÉRCOLES</th>
              <th style={{ border: "1px solid #000", padding: "1px", fontSize: "0.6rem" }}>JUEVES</th>
              <th style={{ border: "1px solid #000", padding: "1px", fontSize: "0.6rem" }}>VIERNES</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time, index) => (
              <tr key={time}>
                <td style={{ border: "1px solid #000", padding: "1px", textAlign: "center", fontSize: "0.55rem" }}>
                  {formatTime(time)} - {formatTime(getSlotEndTime(time))}
                </td>
                {days.map(day => {
                  const cell = grid[index][day];
                  if (cell === 'occupied') return null;

                  if (cell) {
                    return (
                      <td
                        key={day}
                        rowSpan={cell.span}
                        style={{
                          border: "1px solid #000",
                          padding: "1px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          backgroundColor: "#fff",
                          fontSize: "0.55rem"
                        }}
                      >
                        <div style={{ fontWeight: "bold", fontSize: "0.6rem", marginBottom: "1px" }}>{cell.title}</div>
                        <div style={{ fontSize: "0.5rem" }}>
                          {cell.extendedProps?.professorName || cell.extendedProps?.teacherName || "Profesor"}
                        </div>
                        <div style={{ fontSize: "0.5rem", fontStyle: "italic" }}>
                          {cell.extendedProps?.classroomName}
                        </div>
                      </td>
                    );
                  } else {
                    return <td key={day} style={{ border: "1px solid #000", padding: "1px" }}></td>;
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintableSchedule;
