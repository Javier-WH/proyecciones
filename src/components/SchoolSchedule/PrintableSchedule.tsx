import React, { useContext, forwardRef } from "react";
import { turnos } from "./fucntions";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import uptllLogo from "../../assets/uptllLogo.jpeg";

interface PrintableScheduleProps {
  events: any[];
  viewMode: "pnf" | "professor";
  turn: string;
  headerInfo: string;
  seccion: string;
}

const PrintableSchedule = forwardRef<HTMLDivElement, PrintableScheduleProps>(({ events, viewMode, turn, headerInfo, seccion }, ref) => {
  // Generate time slots based on view mode
  let timeSlots: string[] = [];
  const { teachers } = useContext(MainContext) as MainContextValues;

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

  // Helper to get teacher's full name
  const getTeacherName = (professorId: string | null | undefined) => {
    if (!professorId || !teachers) return "Profesor";
    const teacher = teachers.find(t => t.id === professorId);
    if (!teacher) return "Profesor";
    return `${teacher.name} ${teacher.lastName}`;
  };

  // Parse headerInfo - Format: "PNF Name, TRAYECTO X, Trimestre Y, Turno Z"
  const headerParts = headerInfo.split(',').map(p => p.trim());
  const pnfName = headerParts[0] || "PROGRAMA NACIONAL DE FORMACIÓN";
  const trayecto = headerParts[1] || "TRAYECTO I";
  const trimestre = headerParts[2] || "";
  const turno = headerParts[3]?.replace('Turno', '').trim().toUpperCase() || "MAÑANA";

  // Map events to a grid for easier rendering
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

  // Generate grid template rows: 8mm for header + variable height for each time slot
  const rowHeight = viewMode === "professor" ? "8mm" : "22mm";
  const gridTemplateRows = `8mm repeat(${timeSlots.length}, ${rowHeight})`;
  // Generate grid template columns: 40mm for HORA + 46.6mm for each day
  const gridTemplateColumns = "40mm repeat(5, 46.6mm)";

  return (
    <div ref={ref} id="printable-schedule-container" style={{ display: "block" }}>
      <style>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 3mm;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          #printable-content {
            width: 273mm;
            height: 209mm;
            margin: 0;
            padding: 0;
          }
          
          /* Force font sizes in print */
          .subject-title {
            font-size: 2mm !important;
            font-weight: bold !important;
            line-height: 1.3 !important;
            margin-bottom: 0.4mm !important;
          }
          
          .professor-name {
            font-size: 2mm !important;
            line-height: 2mm !important;
          }
          
          .classroom-name {
            font-size: 2mm !important;
            line-height:2mm !important;
            font-style: italic !important;
          }
        }
      `}</style>

      <div id="printable-content" style={{
        padding: "0",
        fontFamily: "Arial, sans-serif",
        color: "#000",
        width: "273mm",
        margin: "0",
        boxSizing: "border-box"
      }}>
        {/* Header section with logo and title */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "3mm",
          padding: "2mm 0"
        }}>
          {/* Logo */}
          <div style={{ width: "35mm", marginRight: "5mm" }}>
            <img
              src={uptllLogo}
              alt="UPTLL Logo"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          {/* Title section */}
          <div style={{ flex: 1, textAlign: "center" }}>
            {viewMode !== "professor" && <>
              <div style={{
                fontSize: "4mm",
                fontWeight: "bold",
                marginBottom: "1mm",
                textTransform: "uppercase"
              }}>
                HORARIO DE CLASES
              </div>
              <div style={{
                fontSize: "3.5mm",
                fontWeight: "bold",
                marginBottom: "0.5mm"
              }}>
                PROGRAMA NACIONAL DE FORMACIÓN
              </div>
            </>
            }
            <div style={{
              fontSize: "3.5mm",
              fontWeight: "bold",
              marginBottom: "1mm"
            }}>
              {pnfName.replace("Horario de P.N.F. en ", "").toUpperCase()}
            </div>
            <div style={{
              fontSize: "3.5mm",
              fontWeight: "bold",
              marginBottom: "1mm"
            }}>
              {trayecto.toUpperCase()} {trimestre.toUpperCase()}
            </div>
          </div>

          {/* Section info */}
          {viewMode !== "professor" && <div style={{
            width: "40mm",
            textAlign: "right",
            fontSize: "3.5mm",
            fontWeight: "bold"
          }}>
            SECCIÓN {seccion}
          </div>}

        </div>

        {/* Turn indicator */}
        <div style={{
          textAlign: "center",
          fontSize: "3.5mm",
          fontWeight: "bold",
          marginBottom: "3mm",
          textTransform: "uppercase"
        }}>
          {turno}
        </div>

        {/* CSS Grid Schedule */}
        <div style={{
          display: "grid",
          gridTemplateColumns: gridTemplateColumns,
          gridTemplateRows: gridTemplateRows,
          border: "0.4mm solid #000",
          width: "273mm"
        }}>
          {/* Header Row */}
          <div style={{
            gridColumn: "1",
            gridRow: "1",
            border: "0.4mm solid #000",
            padding: "2mm",
            fontWeight: "bold",
            fontSize: "3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff"
          }}>HORA</div>
          <div style={{
            gridColumn: "2",
            gridRow: "1",
            border: "0.4mm solid #000",
            padding: "2mm",
            fontWeight: "bold",
            fontSize: "3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff"
          }}>LUNES</div>
          <div style={{
            gridColumn: "3",
            gridRow: "1",
            border: "0.4mm solid #000",
            padding: "2mm",
            fontWeight: "bold",
            fontSize: "3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff"
          }}>MARTES</div>
          <div style={{
            gridColumn: "4",
            gridRow: "1",
            border: "0.4mm solid #000",
            padding: "2mm",
            fontWeight: "bold",
            fontSize: "3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff"
          }}>MIÉRCOLES</div>
          <div style={{
            gridColumn: "5",
            gridRow: "1",
            border: "0.4mm solid #000",
            padding: "2mm",
            fontWeight: "bold",
            fontSize: "3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff"
          }}>JUEVES</div>
          <div style={{
            gridColumn: "6",
            gridRow: "1",
            border: "0.4mm solid #000",
            padding: "2mm",
            fontWeight: "bold",
            fontSize: "3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff"
          }}>VIERNES</div>

          {/* Time slots and content */}
          {timeSlots.map((time, rowIndex) => {
            const gridRowNum = rowIndex + 2; // +2 because row 1 is header, rows start at 1

            return (
              <React.Fragment key={time}>
                {/* Time column */}
                <div style={{
                  gridColumn: "1",
                  gridRow: `${gridRowNum}`,
                  border: "0.4mm solid #000",
                  padding: "1mm",
                  fontSize: "2.8mm",
                  lineHeight: "1.2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  backgroundColor: "#fff"
                }}>
                  {formatTime(time)} - {formatTime(getSlotEndTime(time))}
                </div>

                {/* Day columns */}
                {days.map(day => {
                  const cell = grid[rowIndex][day];
                  if (cell === 'occupied') return null;

                  const gridColumn = day + 1; // +1 because column 1 is HORA
                  console.log(cell)
                  if (cell) {
                    const gridRowEnd = gridRowNum + cell.span;
                    return (
                      <div
                        key={day}
                        style={{
                          gridColumn: `${gridColumn}`,
                          gridRow: `${gridRowNum} / ${gridRowEnd}`,
                          border: "0.4mm solid #000",
                          padding: viewMode === "professor" ? "0.5mm" : "1.5mm",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          backgroundColor: "#fff"
                        }}
                      >
                        <div
                          className="subject-title"
                          style={{
                            fontWeight: "bold",
                            fontSize: viewMode === "professor" ? "2mm" : "3mm",
                            lineHeight: "3mm",
                            marginBottom: "0.4mm"
                          }}
                        >{cell.title}</div>

                        {viewMode !== "professor" && (
                          <div
                            className="professor-name"
                            style={{
                              fontSize: "2mm",
                              lineHeight: "2mm"
                            }}
                          >
                            {getTeacherName(cell.extendedProps?.professorId)}
                          </div>
                        )}

                        {viewMode == "professor" && (
                          <div
                            className="professor-name"
                            style={{
                              fontSize: "2mm",
                              lineHeight: "2mm"
                            }}
                          >
                            {cell.extendedProps?.pnfName}
                          </div>
                        )}

                        <div
                          className="classroom-name"
                          style={{
                            fontSize: "2mm",
                            lineHeight: "2mm",
                            fontStyle: "italic"
                          }}
                        >
                          {cell.extendedProps?.classroomName}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={day}
                        style={{
                          gridColumn: `${gridColumn}`,
                          gridRow: `${gridRowNum}`,
                          border: "0.4mm solid #000",
                          backgroundColor: "#fff"
                        }}
                      ></div>
                    );
                  }
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
});

PrintableSchedule.displayName = 'PrintableSchedule';

export default PrintableSchedule;
