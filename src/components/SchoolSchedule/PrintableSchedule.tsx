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
  headerText?: string[];
  logoUrl?: string;
  // Days of the week active in the schedule config (1=Mon ... 7=Sun).
  // Defaults to Monday-Friday if not provided.
  days?: number[];
}

// Mapping from day number (1=Mon..7=Sun) to display name (uppercase).
const DAY_NAMES: Record<number, string> = {
  1: "LUNES",
  2: "MARTES",
  3: "MIÉRCOLES",
  4: "JUEVES",
  5: "VIERNES",
  6: "SÁBADO",
  7: "DOMINGO",
};

const PrintableSchedule = forwardRef<HTMLDivElement, PrintableScheduleProps>(({ events, viewMode, turn, headerInfo, seccion, activeTurnos, headerText, logoUrl, days: daysProp }, ref) => {
  // Active days: prop wins; fall back to Mon-Fri to preserve previous behaviour.
  // Filter to the valid range (1..7) and sort, in case the prop comes in arbitrary order.
  const days = (daysProp && daysProp.length > 0 ? daysProp : [1, 2, 3, 4, 5])
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b);
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
    if (!teacher || teacher.is_placeholder) return "SIN PROFESOR";
    return `${teacher.name} ${teacher.lastName}`;
  };

  const getLogoSrc = () => {
    if (!logoUrl) return uptllLogo;
    if (logoUrl.startsWith("data:")) return logoUrl;
    if (logoUrl === "logo_impresion_horario") {
      const baseUrl = import.meta.env.MODE === 'development'
        ? '/photo'
        : '/photo';
      return `${baseUrl}/logo_impresion_horario`;
    }
    return logoUrl;
  };

  // Parse headerInfo - Format: "PNF Name, TRAYECTO X, Trimestre Y, Turno Z"
  const headerParts = headerInfo.split(',').map(p => p.trim());
  const pnfName = headerParts[0] || "PROGRAMA NACIONAL DE FORMACIÓN";

  const trayecto = headerParts[1] || "TRAYECTO I";
  const trimestre = headerParts[2] || "";
  const turno = headerParts[3]?.replace('Turno', '').trim().toUpperCase() || "MAÑANA";

  // Map events to a grid for easier rendering
  // Generate grid template rows: 8mm for header + variable height for each time slot
  const rowHeight = (viewMode === "professor" || viewMode === "classroom") ? "8mm" : "10mm";
  const gridTemplateRows = `8mm repeat(${timeSlots.length}, ${rowHeight})`;
  // Page content is 273mm wide (letter landscape minus margins). The HORA
  // column is fixed at 40mm; the remainder is distributed evenly across the
  // active days so adding Saturday/Sunday does not blow past the page width.
  const PAGE_CONTENT_WIDTH_MM = 273;
  const HORA_COL_MM = 40;
  const dayColMm = days.length > 0 ? (PAGE_CONTENT_WIDTH_MM - HORA_COL_MM) / days.length : 46.6;
  const gridTemplateColumns = `${HORA_COL_MM}mm repeat(${days.length}, ${dayColMm}mm)`;

  // Group events logically if viewMode requires it
  const getRenderGroups = () => {
    if (viewMode === "professor") {
      const grouped = new Map<string, any[]>();
      events.forEach(e => {
        const pId = e.extendedProps?.professorId;
        if (pId) {
          if (!grouped.has(pId)) grouped.set(pId, []);
          grouped.get(pId)!.push(e);
        }
      });
      if (grouped.size > 0) {
        return Array.from(grouped.entries())
          .sort((a, b) => getTeacherName(a[0]).localeCompare(getTeacherName(b[0])))
          .map(([id, groupEvents]) => ({
            titleOverride: getTeacherName(id),
            events: groupEvents
          }));
      }
    } else if (viewMode === "classroom") {
      const grouped = new Map<string, any[]>();
      events.forEach(e => {
        const cId = e.extendedProps?.classroomId;
        if (cId) {
          if (!grouped.has(cId)) grouped.set(cId, []);
          grouped.get(cId)!.push(e);
        }
      });
      if (grouped.size > 0) {
        return Array.from(grouped.entries())
          .sort((a, b) => {
            const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
            const nameA = a[1][0]?.extendedProps?.classroomName || '';
            const nameB = b[1][0]?.extendedProps?.classroomName || '';
            return collator.compare(nameA, nameB);
          })
          .map(([id, groupEvents]) => {
            const classroomName = groupEvents[0]?.extendedProps?.classroomName || `Aula ${id}`;
            return {
              titleOverride: `Aula ${classroomName.replace("Aula ", "")}`,
              events: groupEvents
            };
          });
      }
    }

    // Default: one page with all passed events
    return [{ titleOverride: null, events: events || [] }];
  };

  const renderGroups = getRenderGroups();

  const buildGridForEvents = (groupEvents: any[]) => {
    const grid: (any | null | 'occupied')[][] = Array(timeSlots.length).fill(null).map(() => Array(6).fill(null));

    const sortedEvents = [...groupEvents].sort((a: any, b: any) =>
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
          if (days.includes(day)) {
            const prevSlotIndex = slotIndex - 1;
            let merged = false;

            if (prevSlotIndex >= 0) {
              let headIndex = prevSlotIndex;
              while (headIndex >= 0 && grid[headIndex][day] === 'occupied') {
                headIndex--;
              }

              if (headIndex >= 0 && grid[headIndex][day] && grid[headIndex][day] !== 'occupied') {
                const prevEvent = grid[headIndex][day];
                if (headIndex + prevEvent.span === slotIndex) {
                  const sameTitle = prevEvent.title === event.title;
                  const sameProf = prevEvent.extendedProps?.professorId === event.extendedProps?.professorId;
                  const sameClassroom = prevEvent.extendedProps?.classroomId === event.extendedProps?.classroomId;
                  const sameSection = prevEvent.extendedProps?.seccion === event.extendedProps?.seccion;

                  // Match live render: do not merge cross-quarter ghosts with
                // real events (they have a distinct style).
                const sameGhostKind =
                  !!prevEvent.extendedProps?.isCrossQuarterGhost ===
                  !!event.extendedProps?.isCrossQuarterGhost;

                if (sameTitle && sameProf && sameClassroom && sameSection && sameGhostKind) {
                    prevEvent.span += span;
                    merged = true;
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
    return grid;
  };

  return (
    <div ref={ref} id="printable-schedule-container" style={{ display: "block" }}>
      <style>{`
        /* Add page breaks for html2pdf which ignores @media print */
        .printable-page {
          page-break-after: always;
        }
        .printable-page:last-child {
          page-break-after: auto;
        }

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

          .schedule-grid {
            border: 0.3mm solid #000 !important;
            border-left: 0.3mm solid #000 !important;
            outline: 0.3mm solid #000 !important;
            outline-offset: 0 !important;
          }
          
          /* Force font sizes in print */
          .subject-title {
            font-size: 2.5mm !important;
            font-weight: bold !important;
            line-height: 1.3 !important;
            margin-bottom: 0.4mm !important;
          }
          
          .professor-name {
            font-size: 2.2mm !important;
            line-height: 2.2mm !important;
          }
          
          .classroom-name {
            font-size: 2.2mm !important;
            line-height: 2.2mm !important;
            font-style: italic !important;
          }
        }
      `}</style>

      {renderGroups.map((group, groupIndex) => {
        const grid = buildGridForEvents(group.events);

        return (
          <div key={groupIndex} className="printable-page" style={{
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
              <div style={{ width: "35mm", marginRight: "5mm", display: "flex", alignItems: "center" }}>
                <img
                  src={getLogoSrc()}
                  alt="Logo"
                  style={{ width: "100%", height: "auto", maxHeight: "25mm", objectFit: "contain" }}
                />
              </div>

              {/* Title section */}
              <div style={{ flex: 1, textAlign: "center" }}>
                {group.titleOverride ? (
                  // Overridden title for Professor / Classroom
                  <>
                    <div style={{ fontSize: "4mm", fontWeight: "bold", marginBottom: "1mm", textTransform: "uppercase" }}>
                      HORARIO
                    </div>
                    <div style={{ fontSize: "5mm", fontWeight: "bold", marginBottom: "1mm" }}>
                      {group.titleOverride}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Render ALL custom header lines defined in configuration */}
                    {headerText && headerText.length > 0 ? (
                      headerText.map((line, idx) => (
                        line?.trim() && (
                          <div key={idx} style={{
                            fontSize: idx === 0 ? "4mm" : "3.5mm",
                            fontWeight: "bold",
                            marginBottom: "0.5mm",
                            textTransform: "uppercase"
                          }}>
                            {line}
                          </div>
                        )
                      ))
                    ) : (
                      <div style={{ fontSize: "4mm", fontWeight: "bold", marginBottom: "1mm", textTransform: "uppercase" }}>
                        HORARIO DE CLASES
                      </div>
                    )}

                    {/* Automatic technical data (Always present and generated) */}
                    <div style={{ fontSize: "4.5mm", fontWeight: "bold", marginTop: "2mm", marginBottom: "1mm" }}>
                      PNF EN {pnfName.replace(/(?:Horario\s+de\s+)?(?:P\.?N\.?F\.?\s*en\s+)/gi, "").trim().toUpperCase()}
                    </div>

                    <div style={{ fontSize: "3.5mm", fontWeight: "bold", marginBottom: "1mm" }}>
                      {`${trayecto.toUpperCase()} - ${trimestre.toUpperCase()} - SECCIÓN ${seccion}`}
                    </div>
                  </>
                )}
              </div>

              <div style={{ width: "40mm" }}></div>
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
            <div className="schedule-grid" style={{
              display: "grid",
              gridTemplateColumns: gridTemplateColumns,
              gridTemplateRows: gridTemplateRows,
              border: "0.25mm solid #000",
              width: "273mm"
            }}>
              {/* Header Row */}
              <div style={{
                gridColumn: "1",
                gridRow: "1",
                borderLeft: "0.25mm solid #000",
                borderRight: "0.1mm solid #000",
                borderBottom: "0.1mm solid #000",
                padding: "2mm",
                fontWeight: "bold",
                fontSize: "4mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff"
              }}>HORA</div>
              {days.map((day, idx) => (
                <div key={`hdr-${day}`} style={{
                  gridColumn: `${idx + 2}`,
                  gridRow: "1",
                  borderRight: idx < days.length - 1 ? "0.1mm solid #000" : undefined,
                  borderBottom: "0.1mm solid #000",
                  padding: "2mm",
                  fontWeight: "bold",
                  fontSize: "3.5mm",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#fff"
                }}>{DAY_NAMES[day] || `DÍA ${day}`}</div>
              ))}

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
                      borderLeft: "0.25mm solid #000",
                      borderRight: "0.1mm solid #000",
                      borderBottom: rowIndex < timeSlots.length - 1 ? "0.1mm solid #000" : undefined,
                      padding: "1mm",
                      fontSize: "3.2mm",
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
                    {days.map((day, idx) => {
                      const cell = grid[rowIndex][day];
                      if (cell === 'occupied') return null;

                      // Column index follows the position in the `days` array,
                      // not the day number, so non-contiguous day sets still
                      // render in the expected columns. +2 because column 1 is HORA.
                      const gridColumn = idx + 2;

                      if (cell) {
                        const gridRowEnd = gridRowNum + cell.span;
                        return (
                          <div
                            key={day}
                            style={{
                              gridColumn: `${gridColumn}`,
                              gridRow: `${gridRowNum} / ${gridRowEnd}`,
                              borderRight: idx < days.length - 1 ? "0.1mm solid #000" : undefined,
                              borderBottom: "0.1mm solid #000",
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
                                fontSize: (viewMode === "professor" || viewMode === "classroom") ? "2.5mm" : "3.5mm",
                                lineHeight: "3.5mm",
                                marginBottom: "0.4mm"
                              }}
                            >{cell.title}</div>

                            {viewMode === "classroom" ? (
                              <>
                                <div className="professor-name" style={{ fontSize: "2.2mm", lineHeight: "2.2mm" }}>
                                  {getTeacherName(cell.extendedProps?.professorId)}
                                </div>
                                <div style={{ fontSize: "2.2mm", lineHeight: "2.2mm", fontWeight: "bold" }}>
                                  {cell.extendedProps?.pnfName}
                                </div>
                                <div style={{ fontSize: "2.2mm", lineHeight: "2.2mm" }}>
                                  {cell.extendedProps?.trayectoName} - Sec. {cell.extendedProps?.seccion}
                                </div>
                              </>
                            ) : viewMode !== "professor" ? (
                              <div
                                className="professor-name"
                                style={{
                                  fontSize: "2.2mm",
                                  lineHeight: "2.2mm"
                                }}
                              >
                                {getTeacherName(cell.extendedProps?.professorId)}
                              </div>
                            ) : null}

                            {viewMode === "professor" && (
                              <div
                                style={{
                                  fontSize: "2.2mm",
                                  lineHeight: "2.4mm",
                                }}
                              >
                                <div style={{ fontWeight: "bold" }}>{cell.extendedProps?.pnfName}</div>
                                <div>
                                  {cell.extendedProps?.trayectoName} - Sec. {cell.extendedProps?.seccion}
                                </div>
                              </div>
                            )}

                            <div
                              className="classroom-name"
                              style={{
                                fontSize: "2.2mm",
                                lineHeight: "2.2mm",
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
                              borderRight: idx < days.length - 1 ? "0.1mm solid #000" : undefined,
                              borderBottom: rowIndex < timeSlots.length - 1 ? "0.1mm solid #000" : undefined,
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
        );
      })}
    </div>
  );
});

PrintableSchedule.displayName = 'PrintableSchedule';

export default PrintableSchedule;
