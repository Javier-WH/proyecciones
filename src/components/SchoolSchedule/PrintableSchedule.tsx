import React, { useContext, forwardRef } from "react";
import { turnos } from "./fucntions";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import uptllLogo from "../../assets/uptllLogo.jpeg";

interface PrintableScheduleProps {
  events: any[];
  viewMode: "pnf" | "professor" | "classroom";
  turn: string;
  headerInfo: string;
  seccion: string;
  activeTurnos?: Record<string, [string, string][]> | null;
}

const PrintableSchedule = forwardRef<HTMLDivElement, PrintableScheduleProps>(({ events, viewMode, turn, headerInfo, seccion, activeTurnos }, ref) => {
  // Generate time slots based on view mode
  // Generate time slots based on view mode
  let timeSlots: [string, string][] = [];
  const { teachers } = useContext(MainContext) as MainContextValues;

  const usedTurnos = activeTurnos || turnos;

  if (viewMode === "professor" || viewMode === "classroom") {
    const allSlots = new Set<string>();
    Object.values(usedTurnos).forEach((turnSlots) => {
      if (Array.isArray(turnSlots)) {
        turnSlots.forEach((slot) => allSlots.add(JSON.stringify(slot)));
      }
    });
    timeSlots = Array.from(allSlots)
      .map((s) => JSON.parse(s) as [string, string])
      .sort((a, b) => a[0].localeCompare(b[0]));
  } else {
    timeSlots = usedTurnos[turn] || [];
  }

  // Helper to format time for display
  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", hour12: true });
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

  // Ensure events are processed top-to-bottom
  const sortedEvents = [...(events || [])].sort((a: any, b: any) =>
    a.startTime.localeCompare(b.startTime)
  );

  sortedEvents.forEach(event => {
    if (event.daysOfWeek && event.startTime && event.endTime) {
      const startStr = event.startTime;
      const endStr = event.endTime;

      const slotIndex = timeSlots.findIndex(t => t[0] === startStr);
      if (slotIndex === -1) return;

      let span = 1;
      for (let i = slotIndex; i < timeSlots.length; i++) {
        if (timeSlots[i][1] === endStr) {
          span = i - slotIndex + 1;
          break;
        }
      }

      event.daysOfWeek.forEach((day: number) => {
        if (day >= 1 && day <= 5) {
          const prevSlotIndex = slotIndex - 1;
          let merged = false;

          if (prevSlotIndex >= 0) {
            let headIndex = prevSlotIndex;
            // Search upwards for the head block
            while (headIndex >= 0 && grid[headIndex][day] === 'occupied') {
              headIndex--;
            }

            if (headIndex >= 0 && grid[headIndex][day] && grid[headIndex][day] !== 'occupied') {
              const prevEvent = grid[headIndex][day];

              // Check if contiguous visually (head block + its span == current slotIndex)
              if (headIndex + prevEvent.span === slotIndex) {
                const sameTitle = prevEvent.title === event.title;
                const sameProf = prevEvent.extendedProps?.professorId === event.extendedProps?.professorId;
                const sameClassroom = prevEvent.extendedProps?.classroomId === event.extendedProps?.classroomId;
                const sameSection = prevEvent.extendedProps?.seccion === event.extendedProps?.seccion;

                if (sameTitle && sameProf && sameClassroom && sameSection) {
                  prevEvent.span += span; // merge into head block
                  merged = true;

                  // mark current slots as occupied
                  for (let k = 0; k < span; k++) {
                    if (grid[slotIndex + k]) {
                      grid[slotIndex + k][day] = 'occupied';
                    }
                  }
                }
              }
            }
          }

          if (!merged) {
            if (grid[slotIndex][day] === null) {
              grid[slotIndex][day] = { ...event, span };
              for (let k = 1; k < span; k++) {
                if (grid[slotIndex + k]) {
                  grid[slotIndex + k][day] = 'occupied';
                }
              }
            }
          }
        }
      });
    }
  });

  // Generate grid template rows: 8mm for header + variable height for each time slot
  const rowHeight = (viewMode === "professor" || viewMode === "classroom") ? "8mm" : "22mm";
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
            {(viewMode !== "professor" && viewMode !== "classroom") && <>
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
          {(viewMode !== "professor" && viewMode !== "classroom") && <div style={{
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
          {timeSlots.map((slot, rowIndex) => {
            const gridRowNum = rowIndex + 2; // +2 because row 1 is header, rows start at 1
            const [time, endTime] = slot;

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
                  {formatTime(time)} - {formatTime(endTime)}
                </div>

                {/* Day columns */}
                {days.map(day => {
                  const cell = grid[rowIndex][day];
                  if (cell === 'occupied') return null;

                  const gridColumn = day + 1; // +1 because column 1 is HORA

                  if (cell) {
                    const gridRowEnd = gridRowNum + cell.span;
                    return (
                      <div
                        key={day}
                        style={{
                          gridColumn: `${gridColumn}`,
                          gridRow: `${gridRowNum} / ${gridRowEnd}`,
                          border: "0.4mm solid #000",
                          padding: (viewMode === "professor" || viewMode === "classroom") ? "0.5mm" : "1.5mm",
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
                            fontSize: (viewMode === "professor" || viewMode === "classroom") ? "2mm" : "3mm",
                            lineHeight: "3mm",
                            marginBottom: "0.4mm"
                          }}
                        >{cell.title}</div>

                        {viewMode === "classroom" ? (
                          <>
                            <div className="professor-name" style={{ fontSize: "2mm", lineHeight: "2mm" }}>
                              {getTeacherName(cell.extendedProps?.professorId)}
                            </div>
                            <div style={{ fontSize: "2mm", lineHeight: "2mm" }}>
                              {cell.extendedProps?.pnfName}
                            </div>
                            <div style={{ fontSize: "2mm", lineHeight: "2mm" }}>
                              Sec. {cell.extendedProps?.seccion}
                            </div>
                          </>
                        ) : viewMode !== "professor" ? (
                          <div
                            className="professor-name"
                            style={{
                              fontSize: "2mm",
                              lineHeight: "2mm"
                            }}
                          >
                            {getTeacherName(cell.extendedProps?.professorId)}
                          </div>
                        ) : null}

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
