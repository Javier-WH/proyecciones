import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from "react";
import { EventInput } from "@fullcalendar/core";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Subject } from "../../interfaces/subject";
import { TeacherRestriction, SubjectRestriction } from "../../interfaces/teacher";
import "./SchoolSchedule.css";
import {
  getClassrooms,
  insertOrUpdateSchedule,
  type ScheduleDataBase,
  getSchedule,
  saveSubjectRestrictions,
  getSubjectRestrictions,
} from "../../fetch/schedule/scheduleFetch";
import { getTeacherRestrictionsList } from "../../fetch/schedule/teacherRestrictions";
import { Select, Modal, message, List, Tooltip, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { generateScheduleEvents, mergeConsecutiveEvents, turnos, Classroom, Event } from "./fucntions";
import TeacherRestrictionModal from "./TeacherRestrictionModal";
import SubjectRestrictionModal from "./SubjectRestrictionModal";
import TeachersRestrictionsListModal from "./TeachersRestrictionsListModal";
import ScheduleErrorsModal, { scheduleError } from "./ErrorsModal";
import { FaRegSave, FaRegFolderOpen, FaPlus, FaPrint, FaCog } from "react-icons/fa";
import { useReactToPrint } from "react-to-print";
import PrintableSchedule from "./PrintableSchedule";

import styles from "./modal.module.css";
import { normalizeText } from "../../utils/textFilter";
import ScheduleConfigModal from "./ScheduleConfigModal";
import { getScheduleConfig, ScheduleConfig } from "../../fetch/schedule/scheduleConfigFetch";


type RawSubjectRestriction = {
  subject_name?: string;
  subjectName?: string;
  subject_key?: string;
  subjectKey?: string;
  classroom_ids?: string[];
  classroomIds?: string[];
  pnf_id?: string;
  pnfId?: string;
};

type RawTeacherRestriction = {
  teacher_id?: string;
  teacherId?: string;
  restricted_days?: number[];
  days?: number[];
  restricted_hours?: { day: number; start: string; end: string }[];
  hours?: { day: number; start: string; end: string }[];
};

const hexToRgba = (hexColor: string, alpha = 0.15): string => {
  if (!hexColor) return `rgba(26, 115, 232, ${alpha})`;
  let sanitized = hexColor.trim();
  if (sanitized.startsWith("#")) sanitized = sanitized.slice(1);

  // Check if valid hex chars
  const isHex = /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(sanitized);

  if (!isHex) {
    // If not hex (e.g. named color like 'blue' or 'rgb(...)'), default to standard light blue
    // to avoid solid dark backgrounds that make text unreadable.
    return `rgba(26, 115, 232, ${alpha})`;
  }

  if (sanitized.length === 3) {
    sanitized = sanitized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const numericColor = Number.parseInt(sanitized, 16);
  const r = (numericColor >> 16) & 255;
  const g = (numericColor >> 8) & 255;
  const b = numericColor & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};



const SchoolSchedule: React.FC = () => {
  const { subjects, teachers, trayectosList, proyectionId, subjectColors } =
    useContext(MainContext) as MainContextValues;

  // Use a ref for teachers so that generateScheduleEvents can access the latest
  // value without being listed as a dependency (which would cause the schedule
  // to regenerate every time the teacher list updates via WebSocket, producing
  // visually shuffled professor names due to non-deterministic backtracking).
  const teachersRef = useRef(teachers);
  useEffect(() => {
    teachersRef.current = teachers;
  }, [teachers]);
  const consecutiveConfig = useMemo(
    () => ({
      minSlots: 2,
      maxSlots: 3,
    }),
    []
  );
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [eventData, setEventData] = useState<Event[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [turn, setTurn] = useState("mañana");
  const [seccion, setSeccion] = useState("1");
  const [pnf, setPnf] = useState("");
  const [trayectoId, setTrayectoId] = useState("");
  const [teacherRestrictions, setTeacherRestrictions] = useState<TeacherRestriction[]>([]);
  const [teacherRestrictionsReady, setTeacherRestrictionsReady] = useState(false);
  const [subjectRestriction, setSubjectRestriction] = useState<SubjectRestriction[]>([]);
  const [subjectRestrictionsReady, setSubjectRestrictionsReady] = useState(false);
  const [trimestre, setTrimestre] = useState<"q1" | "q2" | "q3">("q1");
  const [errors, setErrors] = useState<scheduleError[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  // Contador de generación: se incrementa cada vez que cambian las restricciones
  // para forzar la regeneración del horario
  const [generationCounter, setGenerationCounter] = useState(0);
  // State to open TeacherRestrictionModal from TeachersRestrictionsListModal
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // State for classroom change context menu
  const [classroomChangeEvent, setClassroomChangeEvent] = useState<{
    eventIndex: number;
    day: number;
    startTime: string;
    endTime: string;
    title: string;
    currentClassroomId: string;
    currentClassroomName: string;
  } | null>(null);
  const [newClassroomId, setNewClassroomId] = useState<string>("");

  const [draggedEventInfo, setDraggedEventInfo] = useState<{
    sourceDay: number;
    sourceStartTime: string;
    rowSpan: number;
    title: string;
    classroomId: string;
    seccion: string;
    pnfName: string;
  } | null>(null);

  // New state for view mode and selected professor
  const [viewMode, setViewMode] = useState<"pnf" | "professor" | "classroom">("pnf");
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const activeTurnos = useMemo(() => {
    const base = scheduleConfig?.turnos || turnos;

    // Filtrar slots inválidos (duración cero donde start === end) de TODOS los turnos
    const sanitized: Record<string, [string, string][]> = {};
    for (const [key, slots] of Object.entries(base)) {
      sanitized[key] = (slots as [string, string][]).filter(
        ([start, end]) => start !== end
      );
    }

    // Only auto-generate "diurno" from mañana+tarde when the saved config
    // does NOT already have a diurno entry. This way, if the user explicitly
    // edits diurno in the config modal, their changes are preserved.
    // When using the hardcoded defaults (no scheduleConfig), always auto-combine.
    const savedHasDiurno = scheduleConfig?.turnos?.diurno !== undefined;
    if (!savedHasDiurno && sanitized.mañana && sanitized.tarde) {
      const combined = [...sanitized.mañana, ...sanitized.tarde].sort((a, b) => a[0].localeCompare(b[0]));
      return { ...sanitized, diurno: combined };
    }
    return sanitized;
  }, [scheduleConfig]);
  const activeDays = scheduleConfig?.days || [1, 2, 3, 4, 5];
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDataBase | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState<ScheduleDataBase[]>([]);
  const [loadedScheduleEvents, setLoadedScheduleEvents] = useState<Event[]>([]); // Eventos del horario cargado

  // Ref for the printable component
  const printableRef = useRef<HTMLDivElement>(null);

  const schedulableSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    return (subjects as Subject[]).filter(
      (subject) => !subject.linkedToSection && subject.key !== "ADMINISTRATIVE_HOURS"
    );
  }, [subjects]);

  // Keep a ref so the generation effect can access the latest data
  // without needing the array reference as a dependency.
  const schedulableSubjectsRef = useRef(schedulableSubjects);
  useEffect(() => {
    schedulableSubjectsRef.current = schedulableSubjects;
  }, [schedulableSubjects]);

  // A content-based fingerprint of the scheduling-relevant data.
  // Only changes when actual subject data changes (professor assignment,
  // hours, sections, etc.), NOT on every WebSocket reference change.
  // This prevents the schedule from regenerating needlessly.
  const subjectsSchedulingKey = useMemo(() => {
    if (!schedulableSubjects.length) return "";
    return schedulableSubjects
      .map(s =>
        `${s.innerId}|${s.pnfId}|${s.trayectoId}|${s.seccion}|${s.turnoName}|${s.subject}|${JSON.stringify(s.quarter)}|${JSON.stringify(s.hours)}`
      )
      .sort()
      .join("||");
  }, [schedulableSubjects]);

  // Helper to get names for the header
  const getHeaderInfo = () => {
    const trimestreLabel =
      trimestre === "q1" ? "Trimestre 1" : trimestre === "q2" ? "Trimestre 2" : "Trimestre 3";

    if (viewMode === "professor") {
      const teacher = teachers?.find((t) => t.id === selectedProfessorId);
      const teacherName = teacher ? `${teacher.name} ${teacher.lastName}` : "Profesor no seleccionado";
      return `Horario para el profesor ${teacherName}, ${trimestreLabel}`;
    } else if (viewMode === "classroom") {
      const classroom = classrooms?.find((c) => c.id === selectedClassroomId);
      const classroomName = classroom ? classroom.classroom : "Aula no seleccionada";
      return `Horario del Aula ${classroomName.replace("Aula ", "")}, ${trimestreLabel}`;
    } else {
      const pnfNameFound =
        eventData.find((e) => e.extendedProps.pnfId === pnf)?.extendedProps.pnfName || "PNF";
      const trayectoName = trayectosList?.find((t) => t.id === trayectoId)?.name || "Trayecto";
      return `Horario de ${pnfNameFound}, ${trayectoName}, ${trimestreLabel}, Turno ${turn}`;
    }
  };

  // react-to-print hook
  const handlePrint = useReactToPrint({
    contentRef: printableRef,
    documentTitle: getHeaderInfo(),
  });

  const loadClassrooms = useCallback(async (): Promise<void> => {
    const classroomsData = await getClassrooms();
    if (classroomsData.error) {
      console.error(classroomsData.message);
      return;
    }
    setClassrooms(classroomsData);
  }, []);

  const loadTeacherRestrictionsFromApi = useCallback(async () => {
    setTeacherRestrictionsReady(false);
    try {
      const response = await getTeacherRestrictionsList();
      if (response?.error) {
        const msg = response?.message?.message || response?.message || "No se pudieron cargar las restricciones de profesores";
        throw new Error(msg);
      }

      const raw = Array.isArray(response?.restrictions)
        ? response.restrictions
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

      const formatted: TeacherRestriction[] = raw
        .map((item: RawTeacherRestriction) => {
          const teacherId = item?.teacher_id ?? item?.teacherId;
          if (!teacherId) return null;
          return {
            teacherId,
            days: item?.restricted_days ?? item?.days ?? [],
            hours: item?.restricted_hours ?? item?.hours ?? [],
          };
        })
        .filter(Boolean) as TeacherRestriction[];

      setTeacherRestrictions(formatted);
    } catch (error) {
      console.error(error);
      message.error(
        error instanceof Error ? error.message : "No se pudieron cargar las restricciones de profesores"
      );
      setTeacherRestrictions([]);
    } finally {
      setTeacherRestrictionsReady(true);
    }
  }, []);

  const loadSubjectRestrictionsFromApi = useCallback(async () => {
    if (!proyectionId) {
      setSubjectRestriction([]);
      setSubjectRestrictionsReady(true);
      return;
    }

    try {
      const response = await getSubjectRestrictions(proyectionId);
      if (response?.error) {
        if (response.status === 404) {
          setSubjectRestriction([]);
          setSubjectRestrictionsReady(true);
          return;
        }
        const msg = response?.message?.message || response?.message || "No se pudieron cargar las restricciones de materias";
        throw new Error(msg);
      }

      const rawRestrictions = Array.isArray(response?.restrictions)
        ? response.restrictions
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

      const formatted: SubjectRestriction[] = rawRestrictions
        .map((item: RawSubjectRestriction) => {
          const subjectName = item?.subject_name ?? item?.subjectName ?? "";
          // Always normalize the key from the name if possible for consistency, 
          // or use the stored key as fallback.
          const subjectKey = (subjectName ? normalizeText(subjectName) : (item?.subject_key ?? item?.subjectKey));

          const classroomIds = item?.classroom_ids ?? item?.classroomIds ?? [];
          const pnfId = item?.pnf_id ?? item?.pnfId;

          if (!subjectKey) return null;

          return {
            subjectKey,
            subjectName: subjectName || subjectKey,
            classroomIds,
            pnfId: pnfId || undefined,
          };
        })
        .filter(Boolean) as SubjectRestriction[];

      setSubjectRestriction(formatted);
      setSubjectRestrictionsReady(true);
    } catch (error) {
      console.error(error);
      message.error(
        error instanceof Error ? error.message : "No se pudieron cargar las restricciones de materias"
      );
      setSubjectRestrictionsReady(true);
    }
  }, [proyectionId]);

  const persistSubjectRestrictions = useCallback(
    async (restrictions: SubjectRestriction[]) => {
      if (!proyectionId) {
        throw new Error("No se pudo identificar la proyección para guardar las restricciones");
      }

      const payload = {
        proyection_id: proyectionId,
        restrictions: restrictions.map((rest) => ({
          subject_key: rest.subjectKey,
          subject_name: rest.subjectName,
          classroom_ids: rest.classroomIds,
          pnf_id: rest.pnfId,
        })),
      };

      const response = await saveSubjectRestrictions(payload);

      if (response?.error) {
        const msg = response?.message?.message || response?.message || "No se pudieron guardar las restricciones de materias";
        const error = new Error(msg);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }
    },
    [proyectionId]
  );

  const addError = (err: scheduleError) => {
    setErrors((prevErrors) => [...prevErrors, err]);
  };

  // Force-insert a subject that failed scheduling by ignoring professor day
  // restrictions and classroom preferences. Still respects hard constraints:
  // no professor double-booking, no section conflicts, no classroom double-booking.
  const handleForceInsert = useCallback((errorInfo: scheduleError) => {
    if (!errorInfo.subjectId) return;

    const currentSubjects = schedulableSubjectsRef.current;
    const subject = currentSubjects?.find(
      (s) => s.innerId === errorInfo.subjectId
    );
    if (!subject) {
      message.error("No se encontró la materia para forzar la inserción.");
      return;
    }

    const turnoName = subject.turnoName?.toLowerCase() || "";
    const timeSlots = activeTurnos[turnoName];
    if (!timeSlots || timeSlots.length === 0) {
      message.error("No hay slots de tiempo disponibles para este turno.");
      return;
    }

    // Use ALL days (ignore professor day restrictions)
    const allDays = scheduleConfig?.days || [1, 2, 3, 4, 5];
    // Use ALL classrooms (ignore classroom restrictions)
    const allClassrooms = classrooms;

    if (allClassrooms.length === 0) {
      message.error("No hay aulas disponibles.");
      return;
    }

    // Gather ALL existing events (loaded + generated) to check conflicts
    const allEvents = [...loadedScheduleEvents, ...eventData];

    const hoursNeeded = errorInfo.totalHours || subject.hours[trimestre] || 0;
    if (hoursNeeded <= 0) {
      message.error("Esta materia no tiene horas pendientes por asignar.");
      return;
    }

    // Build an occupancy map from all existing events
    // Key: "day-startTime" → { professorIds, classroomIds, sectionKeys }
    const occupancy = new Map<string, {
      professorIds: Set<string>;
      classroomIds: Set<string>;
      sectionKeys: Set<string>;
    }>();

    for (const evt of allEvents) {
      if (!evt.daysOfWeek?.length || !evt.startTime) continue;
      const day = evt.daysOfWeek[0];
      const key = `${day}-${evt.startTime}`;
      if (!occupancy.has(key)) {
        occupancy.set(key, {
          professorIds: new Set(),
          classroomIds: new Set(),
          sectionKeys: new Set(),
        });
      }
      const occ = occupancy.get(key)!;
      if (evt.extendedProps?.professorId) {
        occ.professorIds.add(evt.extendedProps.professorId);
      }
      if (evt.extendedProps?.classroomId) {
        occ.classroomIds.add(evt.extendedProps.classroomId);
      }
      const secKey = `${evt.extendedProps?.pnfId}-${evt.extendedProps?.trayectoId}-${evt.extendedProps?.seccion}`;
      occ.sectionKeys.add(secKey);
    }

    const professorId = errorInfo.professorId || subject.quarter[trimestre] || null;
    const sectionKey = `${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`;

    // Try to find slots: for each day, for each slot, check if we can place
    const placedEvents: Event[] = [];
    let hoursPlaced = 0;

    // Prefer consecutive slots on the same day for better schedule quality
    // Helper: check if a slot is available (no hard-constraint violations)


    // For each day, find all consecutive runs of available slots
    type ConsecutiveRun = { day: number; startSlotIdx: number; slots: { slotIdx: number; classroom: Classroom }[] };
    const allRuns: ConsecutiveRun[] = [];

    for (const day of allDays) {
      // Find runs per day AND per classroom to ensure they are actually together
      for (const cr of allClassrooms) {
        let currentRun: ConsecutiveRun | null = null;
        let lastEnd: string | null = null;

        for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
          const [start, end] = timeSlots[slotIdx];
          const key = `${day}-${start}`;
          const occ = occupancy.get(key);

          // Check hard constraints for this specific teacher/section and THIS classroom
          const profConflict = professorId && occ?.professorIds.has(professorId);
          const sectionConflict = occ?.sectionKeys.has(sectionKey);
          const roomConflict = occ?.classroomIds.has(cr.id);

          const isAvailable = !profConflict && !sectionConflict && !roomConflict;

          // Consecutive means: same day, same classroom, AND end of previous == start of current
          const isConsecutive = isAvailable && (lastEnd === null || lastEnd === start);

          if (isConsecutive) {
            if (!currentRun) {
              currentRun = { day, startSlotIdx: slotIdx, slots: [] };
            }
            currentRun.slots.push({ slotIdx, classroom: cr });
            lastEnd = end;
          } else {
            // End of run
            if (currentRun && currentRun.slots.length > 0) {
              allRuns.push(currentRun);
            }
            if (isAvailable) {
              // Start a NEW run with this slot if available but not consecutive
              currentRun = { day, startSlotIdx: slotIdx, slots: [{ slotIdx, classroom: cr }] };
              lastEnd = end;
            } else {
              currentRun = null;
              lastEnd = null;
            }
          }
        }
        if (currentRun && currentRun.slots.length > 0) {
          allRuns.push(currentRun);
        }
      }
    }

    // Sort runs: prefer longer runs first (can fit more hours), then earlier days
    allRuns.sort((a, b) => b.slots.length - a.slots.length || a.day - b.day || a.startSlotIdx - b.startSlotIdx);

    const preventSingleBlocks = !!scheduleConfig?.prevent_single_hour_blocks;

    // If prevent_single_hour_blocks is on, filter out runs with only 1 slot
    const usableRuns = preventSingleBlocks
      ? allRuns.filter(run => run.slots.length >= 2)
      : allRuns;

    // Place hours using consecutive runs
    for (const run of usableRuns) {
      if (hoursPlaced >= hoursNeeded) break;

      let slotsToUse = Math.min(run.slots.length, hoursNeeded - hoursPlaced);

      if (preventSingleBlocks) {
        // Rule 1: Never place just 1 slot (creates a single-hour block now)
        if (slotsToUse === 1) {
          if (run.slots.length >= 2) {
            slotsToUse = 2;
          } else {
            continue;
          }
        }

        // Rule 2: Never leave exactly 1 remaining hour (would be impossible to place later)
        // Example: 3 hours needed, taking 2 leaves 1 → take 3 instead or reduce to 0
        const remaining = (hoursNeeded - hoursPlaced) - slotsToUse;
        if (remaining === 1) {
          // Option A: take one more slot from this run (if available)
          if (run.slots.length > slotsToUse) {
            slotsToUse += 1;
          }
          // Option B: take one fewer, but only if that still leaves us with >= 2
          else if (slotsToUse - 1 >= 2) {
            slotsToUse -= 1;
          }
          // Option C: skip this run entirely — placing here guarantees an orphan
          else {
            continue;
          }
        }
      }

      for (let i = 0; i < slotsToUse; i++) {
        const { slotIdx, classroom } = run.slots[i];
        const [start, end] = timeSlots[slotIdx];
        const key = `${run.day}-${start}`;

        const newEvent: Event = {
          title: subject.subject,
          daysOfWeek: [run.day],
          startTime: start,
          endTime: end,
          extendedProps: {
            subjectId: subject.innerId,
            professorId: professorId,
            classroomId: classroom.id,
            classroomName: classroom.classroom,
            pnfId: subject.pnfId,
            trayectoId: subject.trayectoId,
            trayectoName: subject.trayectoName,
            seccion: subject.seccion,
            pnfName: subject.pnf,
            turnName: subject.turnoName,
            blockId: `${run.day}-${subject.innerId}`,
          },
        };

        placedEvents.push(newEvent);
        hoursPlaced++;

        // Update occupancy
        if (!occupancy.has(key)) {
          occupancy.set(key, {
            professorIds: new Set(),
            classroomIds: new Set(),
            sectionKeys: new Set(),
          });
        }
        const updatedOcc = occupancy.get(key)!;
        if (professorId) updatedOcc.professorIds.add(professorId);
        updatedOcc.classroomIds.add(classroom.id);
        updatedOcc.sectionKeys.add(sectionKey);
      }
    }

    if (placedEvents.length === 0) {
      message.error("No se encontró ningún espacio disponible, incluso ignorando restricciones de días y aulas.");
      return;
    }

    // Build a detailed summary of where each hour was placed
    const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const details = placedEvents.map(evt => {
      const dayName = dayNames[evt.daysOfWeek[0]] || `Día ${evt.daysOfWeek[0]}`;
      return `• ${dayName} ${evt.startTime} - ${evt.endTime} → ${evt.extendedProps.classroomName}`;
    }).join("\n");

    const title = hoursPlaced < hoursNeeded
      ? `Se asignaron ${hoursPlaced} de ${hoursNeeded} horas de "${subject.subject}"`
      : `Se asignaron las ${hoursPlaced} horas de "${subject.subject}"`;

    Modal.info({
      title,
      content: (
        <div style={{ whiteSpace: "pre-line", marginTop: "8px", fontSize: "13px", lineHeight: "1.8" }}>
          {details}
        </div>
      ),
      width: 480,
    });

    // Add as pinned events and trigger regeneration
    setLoadedScheduleEvents(prev => [...prev, ...placedEvents]);
    setGenerationCounter(prev => prev + 1);
  }, [eventData, loadedScheduleEvents, classrooms, activeTurnos, trimestre, scheduleConfig]);

  // Handler to change classroom for a specific event (specific day+time block)
  const handleChangeClassroom = () => {
    if (!classroomChangeEvent || !newClassroomId) return;

    const newClassroom = classrooms.find((c) => c.id === newClassroomId);
    if (!newClassroom) return;

    // Check if the new classroom is already occupied by another event
    const allEventsForConflict = [...loadedScheduleEvents, ...eventData];
    const conflictingEvent = allEventsForConflict.find((evt) => {
      // Must be on the same day
      const sameDay = evt.daysOfWeek.includes(classroomChangeEvent.day);
      // Must already use the target classroom
      const usesTargetClassroom = evt.extendedProps.classroomId === newClassroomId;
      // Must overlap with our block's time range
      const overlapsTime =
        evt.startTime >= classroomChangeEvent.startTime &&
        evt.startTime < classroomChangeEvent.endTime;
      // Must NOT be the same event we're changing (different title or different classroom)
      const isOtherEvent =
        evt.title !== classroomChangeEvent.title ||
        evt.extendedProps.classroomId !== classroomChangeEvent.currentClassroomId;

      return sameDay && usesTargetClassroom && overlapsTime && isOtherEvent;
    });

    const applyClassroomChangeAndRecalculate = () => {
      const allEvents = [...loadedScheduleEvents, ...eventData];

      // Find the specific events we are modifying
      const modifiedEvents = allEvents
        .filter((evt) => {
          const matchesDay = evt.daysOfWeek.includes(classroomChangeEvent.day);
          const matchesTitle = evt.title === classroomChangeEvent.title;
          const withinTimeRange =
            evt.startTime >= classroomChangeEvent.startTime &&
            evt.startTime < classroomChangeEvent.endTime;
          const matchesClassroom =
            evt.extendedProps.classroomId === classroomChangeEvent.currentClassroomId;
          return matchesDay && matchesTitle && withinTimeRange && matchesClassroom;
        })
        .map((evt) => ({
          ...evt,
          extendedProps: {
            ...evt.extendedProps,
            classroomId: newClassroomId,
            classroomName: newClassroom.classroom,
          },
        }));

      if (modifiedEvents.length === 0) {
        message.error("No se pudo aplicar el cambio. El evento original no se encontró.");
        setClassroomChangeEvent(null);
        setNewClassroomId("");
        return;
      }

      // Remover cualquier versión previa de esta materia de los eventos clavados (pinned)
      setLoadedScheduleEvents((prev) => {
        const title = classroomChangeEvent.title;
        const day = classroomChangeEvent.day;
        const startTime = classroomChangeEvent.startTime;
        const endTime = classroomChangeEvent.endTime;

        const filteredPrev = prev.filter(
          (e) =>
            !(
              e.title === title &&
              e.daysOfWeek.includes(day) &&
              e.startTime >= startTime &&
              e.startTime < endTime
            )
        );

        return [...filteredPrev, ...modifiedEvents];
      });

      // Recalcular todo el horario alrededor de este nuevo evento fijo
      setGenerationCounter((prev) => prev + 1);

      message.success(
        `Aula cambiada a "${newClassroom.classroom}" para ${classroomChangeEvent.title} el día seleccionado.`
      );
      setClassroomChangeEvent(null);
      setNewClassroomId("");
    };

    if (conflictingEvent) {
      const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      Modal.confirm({
        title: "Aula Ocupada",
        content: `El aula "${newClassroom.classroom}" ya está ocupada por "${conflictingEvent.title}" el ${dayNames[classroomChangeEvent.day]} a las ${conflictingEvent.startTime}. ¿Deseas reasignar de todos modos y recalcular el horario alrededor de este cambio?`,
        okText: "Sí, cambiar aula y recalcular",
        cancelText: "Deshacer",
        okButtonProps: { danger: true },
        onOk: () => {
          applyClassroomChangeAndRecalculate();
        },
      });
      return;
    }

    applyClassroomChangeAndRecalculate();
  };

  const putSubjectRestriction = async (subjectName: string, classroomIds: string[], pnfId?: string) => {
    if (!subjectRestrictionsReady) {
      throw new Error("Las restricciones aún se están cargando. Intente nuevamente en unos segundos");
    }

    if (!subjectName || !classroomIds) {
      throw new Error("Debe seleccionar una materia y al menos un salón");
    }

    const normalizedName = normalizeText(subjectName);
    if (!normalizedName) {
      throw new Error("El nombre de la materia no es válido");
    }

    const previousRestrictions = subjectRestriction;
    let updatedRestrictions: SubjectRestriction[] = JSON.parse(JSON.stringify(subjectRestriction));

    if (classroomIds.length === 0) {
      updatedRestrictions = updatedRestrictions.filter(
        (rest: SubjectRestriction) => !(rest.subjectKey === normalizedName && rest.pnfId === pnfId)
      );
    } else {
      const existing = updatedRestrictions.find(
        (rest) => rest.subjectKey === normalizedName && rest.pnfId === pnfId
      ) || updatedRestrictions.find(
        (rest) => rest.subjectKey === normalizedName && !rest.pnfId
      );
      if (existing) {
        existing.classroomIds = classroomIds;
        existing.subjectName = subjectName;
      } else {
        updatedRestrictions.push({ subjectKey: normalizedName, subjectName, classroomIds, pnfId });
      }
    }

    setSubjectRestriction(updatedRestrictions);
    // Forzar regeneración del horario
    setGenerationCounter((c) => c + 1);

    try {
      await persistSubjectRestrictions(updatedRestrictions);
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 404) {
        message.warning(
          "El backend todavía no expone /subject-restrictions, se mantendrán localmente hasta que esté disponible."
        );
        return;
      }
      setSubjectRestriction(previousRestrictions);
      // También forzar regeneración al hacer rollback
      setGenerationCounter((c) => c + 1);
      throw error;
    }
  };

  const putTeacherRestriction = (
    id: string,
    restricions: number[],
    hours: { day: number; start: string; end: string }[] = []
  ) => {
    if (!id || id.length === 0) return;

    // Usar functional setState para garantizar nueva referencia
    setTeacherRestrictions((prev) => {
      // Si no hay restricciones, eliminar el profesor de la lista
      if (restricions.length === 0 && hours.length === 0) {
        return prev.filter((rest) => rest.teacherId !== id);
      }

      const existing = prev.find((rest) => rest.teacherId === id);
      if (existing) {
        // Crear nuevo array con el elemento actualizado (inmutable)
        return prev.map((rest) =>
          rest.teacherId === id
            ? { ...rest, days: [...restricions], hours: [...hours] }
            : rest
        );
      } else {
        return [...prev, { teacherId: id, days: [...restricions], hours: [...hours] }];
      }
    });
    setTeacherRestrictionsReady(true);
    // Forzar regeneración del horario
    setGenerationCounter((c) => c + 1);
  };

  const saveSchedule = async () => {
    if (!proyectionId) {
      message.error("Error: ID de proyección no disponible. No se puede guardar el horario.");
      return;
    }

    // Usar Modal.confirm o Modal.prompt de Ant Design para pedir el nombre
    Modal.confirm({
      title: "Guardar Horario",
      content: (
        <div>
          <p>Por favor, introduce un nombre para el horario:</p>
          <input
            id="schedule-name-input"
            type="text"
            placeholder="Nombre del Horario"
            defaultValue={`Horario ${new Date().toLocaleDateString()}`}
            style={{ width: "100%", padding: "8px", marginTop: "10px" }}
          />
        </div>
      ),
      okText: "Guardar",
      cancelText: "Cancelar",
      onOk: async () => {
        const nameInput = document.getElementById("schedule-name-input") as HTMLInputElement;
        const scheduleName = nameInput.value.trim();

        if (!scheduleName) {
          message.error("El nombre del horario no puede estar vacío.");
          return Promise.reject(new Error("Nombre vacío")); // Evita que el modal se cierre si hay error
        }

        const newSchedule: ScheduleDataBase = {
          name: scheduleName,
          schedule: JSON.stringify(events),
          proyection_id: proyectionId,
        };

        const { error, message: msg } = await insertOrUpdateSchedule(newSchedule);

        if (error) {
          // Muestra un mensaje de error si la inserción/actualización falla
          message.error(`Error al guardar el horario: ${msg || "Error desconocido."}`);
          // Evita que el modal se cierre si la acción asíncrona falla
          return Promise.reject(new Error("Error de guardado"));
        } else {
          // Muestra un mensaje de éxito
          message.success(`Horario "${scheduleName}" guardado con éxito.`);
        }
      },
      onCancel() {
        // El usuario canceló la operación
        console.log("Guardado de horario cancelado");
      },
    });
  };

  // Función para abrir el modal (se conecta al click del icono FaRegFolderOpen)
  const openSchedule = async () => {
    if (!proyectionId) {
      message.error("Error: ID de proyección no disponible. No se puede cargar la lista de horarios.");
      return;
    }

    // Reiniciar estados y empezar a cargar
    setScheduleList([]);
    setSelectedSchedule(null);

    // (Opcional): Si tienes un estado de `isLoading` lo puedes usar aquí.
    // setIsFetchingSchedules(true);

    try {
      const result = await getSchedule({});

      // Asumiendo que getSchedule devuelve una lista o un objeto con error/lista.
      if (result.error || result.length === 0) {
        message.info("No se encontraron horarios guardados.");
        return;
      }

      setScheduleList(result);
      setIsScheduleModalOpen(true); // Abrir el modal solo si hay datos
    } catch (error) {
      console.error("Error fetching schedules:", error);
      message.error("Ocurrió un error inesperado al cargar los horarios.");
    }
    // finally { setIsFetchingSchedules(false); }
  };

  // Función para crear un nuevo horario (limpiar eventos cargados)
  const newSchedule = () => {
    setLoadedScheduleEvents([]);
    message.info("Creando nuevo horario. Los eventos cargados han sido limpiados.");
  };

  // Función que se ejecuta al presionar "Abrir" dentro del Modal
  const handleOpenScheduleOk = () => {
    if (!selectedSchedule?.id) {
      message.warning("Por favor, selecciona un horario para abrir.");
      return; // El Modal no se cerrará
    }

    // 1. Encontrar el objeto completo del horario seleccionado
    const _selectedSchedule = scheduleList.find((s) => s.id === selectedSchedule.id);

    if (!_selectedSchedule) {
      message.error("Error: Horario seleccionado no encontrado en la lista.");
      return;
    }

    try {
      // 2. Parsear el JSON string
      const loadedEvents: Event[] = JSON.parse(_selectedSchedule.schedule);

      // 3. IMPORTANTE: Limpiar eventos generados previamente
      setEventData([]);

      // 4. Cargar los eventos del horario
      setLoadedScheduleEvents(loadedEvents);

      // 5. Cerrar el modal y notificar éxito
      setIsScheduleModalOpen(false);
      message.success(`Horario "${_selectedSchedule.name}" cargado con éxito.`);
    } catch (error) {
      console.error("Error parsing schedule data:", error);
      message.error(`Error al procesar los datos del horario "${_selectedSchedule.name}".`);
    }
  };

  useEffect(() => {
    loadClassrooms();
    loadTeacherRestrictionsFromApi();
  }, [loadClassrooms, loadTeacherRestrictionsFromApi]);

  useEffect(() => {
    setSubjectRestrictionsReady(false);
    loadSubjectRestrictionsFromApi();
  }, [loadSubjectRestrictionsFromApi]);

  useEffect(() => {
    getScheduleConfig().then(data => {
      if (data) setScheduleConfig(data);
    });
  }, []);

  // Genera los eventos del horario.
  // Se re-ejecuta cuando cambian las restricciones, el trimestre, las materias,
  // las aulas, o el generationCounter (forzado al aplicar restricciones).
  // IMPORTANT: subjects and teachers are accessed via refs and compared via
  // content-based keys to avoid unnecessary regeneration from WebSocket updates.
  useEffect(() => {
    const currentSubjects = schedulableSubjectsRef.current;
    if (
      !classrooms ||
      classrooms.length === 0 ||
      !currentSubjects || currentSubjects.length === 0 ||
      !teacherRestrictionsReady ||
      !subjectRestrictionsReady
    ) {
      return;
    }
    setErrors([]);
    const eventsdata = generateScheduleEvents({
      subjects: currentSubjects,
      classrooms: classrooms,
      trimestre: trimestre,
      preferredClassrooms: subjectRestriction,
      unavailableDays: teacherRestrictions,
      conserveSlots: scheduleConfig?.conserve_slots || consecutiveConfig.maxSlots,
      minConsecutiveSlots: scheduleConfig?.min_consecutive_slots || consecutiveConfig.minSlots,
      existingEvents: loadedScheduleEvents,
      setErrors: addError,
      customDays: scheduleConfig?.days,
      customTurnos: activeTurnos,
      distributeEquitably: scheduleConfig?.distribute_equitably,
      preventSingleHourBlocks: scheduleConfig?.prevent_single_hour_blocks,
      teachers: teachersRef.current || [],
    });

    setEventData(eventsdata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    classrooms,
    subjectsSchedulingKey, // Content-based key: only triggers when actual subject data changes
    teacherRestrictions,
    trimestre,
    subjectRestriction,
    loadedScheduleEvents,
    teacherRestrictionsReady,
    subjectRestrictionsReady,
    consecutiveConfig,
    scheduleConfig,
    activeTurnos,
    // NOTE: `teachers` and `schedulableSubjects` are intentionally NOT dependencies.
    // They are accessed via refs to avoid regenerating the entire schedule
    // on every WebSocket update (which shuffles the schedule visually due to
    // non-deterministic backtracking in the scheduling algorithm).
    generationCounter,  // Fuerza regeneración cuando se aplican restricciones
  ]);

  // filtra los eventos segun el turno, seccion, pnf y trayecto y los agrupa
  useEffect(() => {
    let filteredLoaded: Event[] = [];
    let filteredGenerated: Event[] = [];

    if (viewMode === "pnf") {
      // Filtrar eventos cargados con los criterios actuales
      filteredLoaded = loadedScheduleEvents.filter(
        (event) =>
          event.extendedProps.pnfId === pnf &&
          event.extendedProps.seccion === seccion &&
          event.extendedProps.trayectoId === trayectoId &&
          event.extendedProps.turnName.toLowerCase() === turn
      );

      // Filtrar eventos generados con los mismos criterios
      filteredGenerated = eventData.filter(
        (event) =>
          event.extendedProps.pnfId === pnf &&
          event.extendedProps.seccion === seccion &&
          event.extendedProps.trayectoId === trayectoId &&
          event.extendedProps.turnName.toLowerCase() === turn
      );
    } else if (viewMode === "professor") {
      if (!selectedProfessorId) {
        setEvents([]);
        return;
      }
      // Filtrar por profesor
      filteredLoaded = loadedScheduleEvents.filter(
        (event) => event.extendedProps.professorId === selectedProfessorId
      );
      filteredGenerated = eventData.filter(
        (event) => event.extendedProps.professorId === selectedProfessorId
      );
    } else if (viewMode === "classroom") {
      if (!selectedClassroomId) {
        setEvents([]);
        return;
      }
      // Filter by classroom
      filteredLoaded = loadedScheduleEvents.filter(
        (event) => event.extendedProps.classroomId === selectedClassroomId
      );
      filteredGenerated = eventData.filter(
        (event) => event.extendedProps.classroomId === selectedClassroomId
      );
    }

    // Mergear solo los eventos generados (los cargados ya están mergeados)
    const mergedGenerated = mergeConsecutiveEvents(filteredGenerated);

    // Combinar: eventos cargados (ya mergeados) + eventos generados (recién mergeados)
    const combinedEvents = [...filteredLoaded, ...mergedGenerated];
    setEvents(combinedEvents);
  }, [
    eventData,
    loadedScheduleEvents,
    turn,
    seccion,
    pnf,
    trayectoId,
    viewMode,
    selectedProfessorId,
    selectedClassroomId,
  ]);

  // Set default values when data loads
  useEffect(() => {
    if (viewMode === "pnf") {
      if (!pnf && eventData.length > 0) {
        const firstPnf = eventData.find((e) => e.extendedProps?.pnfId)?.extendedProps.pnfId;
        if (firstPnf) setPnf(firstPnf);
      }
      if (!trayectoId && trayectosList && trayectosList.length > 0) {
        setTrayectoId(trayectosList[0].id);
      }
      if (!seccion && eventData.length > 0) {
        const sections = Array.from(new Set(eventData.map((event) => event?.extendedProps?.seccion))).filter(
          Boolean
        );
        if (sections.length > 0) setSeccion(sections[0] as string);
      }
    } else if (viewMode === "professor") {
      if (!selectedProfessorId && teachers && teachers.length > 0) {
        setSelectedProfessorId(teachers[0].id);
      }
    } else if (viewMode === "classroom") {
      if (!selectedClassroomId && classrooms && classrooms.length > 0) {
        setSelectedClassroomId(classrooms[0].id);
      }
    }
  }, [
    eventData,
    trayectosList,
    teachers,
    classrooms,
    viewMode,
    pnf,
    trayectoId,
    seccion,
    selectedProfessorId,
    selectedClassroomId,
  ]);

  // --- TABLE DATA PREPARATION ---
  const { tableSlots, tableGrid } = useMemo(() => {
    let slots: string[][] = [];

    // Logic from PrintableSchedule for slots
    if (viewMode === "professor" || viewMode === "classroom") {
      // Use union of all unique slots from the SOURCE turns (mañana, tarde, nocturno)
      // Exclude composite turns like "diurno" since they may have different boundaries
      // that don't match the actual scheduling slots.
      const allSlots = new Set<string>();
      if (activeTurnos) {
        Object.entries(activeTurnos).forEach(([key, turnSlots]) => {
          // Skip "diurno" — it's a derived/composite turn
          if (key === "diurno") return;
          if (Array.isArray(turnSlots)) {
            turnSlots.forEach((slot) => allSlots.add(JSON.stringify(slot)));
          }
        });
      }

      slots = Array.from(allSlots)
        .map((s) => JSON.parse(s) as [string, string])
        .sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      // For PNF/Student view, utilize the active turn slots config
      slots = activeTurnos?.[turn] || [];
    }

    // Build Grid
    // Rows: Slots
    // Cols: Days 1..7 (Monday to Sunday)
    const g = Array(slots.length).fill(null).map(() => Array(8).fill(null));

    // Sort events by start time to ensure sequential processing
    const sortedEvents = [...(events || [])].sort((a: any, b: any) =>
      a.startTime.localeCompare(b.startTime)
    );

    sortedEvents.forEach((event: any) => {
      if (!event.daysOfWeek || !event.daysOfWeek.length) return;
      const day = event.daysOfWeek[0];
      if (day < 1 || day > 7) return;

      const slotIndex = slots.findIndex((s) => s[0] === event.startTime);
      if (slotIndex === -1) return;

      // Calculate Span
      let span = 1;
      for (let i = slotIndex; i < slots.length; i++) {
        if (slots[i][1] === event.endTime) {
          span = i - slotIndex + 1;
          break;
        }
      }

      // Check if we can merge with the event above
      // We look for the "head" of the event covering the previous slot
      const prevSlotIndex = slotIndex - 1;
      let merged = false;

      if (prevSlotIndex >= 0) {
        let headIndex = prevSlotIndex;
        // Search upwards for the head block
        while (headIndex >= 0 && g[headIndex][day]?.occupied) {
          headIndex--;
        }

        if (headIndex >= 0 && g[headIndex][day] && !g[headIndex][day].occupied) {
          const prevEvent = g[headIndex][day];

          // Check if contiguous: (headIndex + rowSpan) should equal current slotIndex
          if (headIndex + prevEvent.rowSpan === slotIndex) {
            // Check identity
            const sameTitle = prevEvent.title === event.title;
            const sameProf = prevEvent.extendedProps?.professorId === event.extendedProps?.professorId;
            const sameClassroom = prevEvent.extendedProps?.classroomId === event.extendedProps?.classroomId;
            const sameSection = prevEvent.extendedProps?.seccion === event.extendedProps?.seccion;

            if (sameTitle && sameProf && sameClassroom && sameSection) {
              // Merge it!
              prevEvent.rowSpan += span;
              merged = true;

              // Mark current slots as occupied
              for (let k = 0; k < span; k++) {
                if (g[slotIndex + k]) {
                  g[slotIndex + k][day] = { occupied: true };
                }
              }
            }
          }
        }
      }

      if (!merged) {
        // If cell is empty, place event
        if (!g[slotIndex][day]) {
          g[slotIndex][day] = { ...event, rowSpan: span };
          // Mark spanned cells as occupied
          for (let k = 1; k < span; k++) {
            if (g[slotIndex + k]) {
              g[slotIndex + k][day] = { occupied: true };
            }
          }
        }
      }
    });

    return { tableSlots: slots, tableGrid: g };
  }, [viewMode, activeTurnos, turn, events]);
  // ------------------------------

  const handleDrop = (targetRowIndex: number, targetDay: number) => {
    if (!draggedEventInfo || !tableSlots[targetRowIndex]) return;

    const { sourceDay, sourceStartTime, rowSpan, title, classroomId, seccion, pnfName } = draggedEventInfo;
    const targetStartTime = tableSlots[targetRowIndex][0];

    if ((sourceDay === targetDay && sourceStartTime === targetStartTime) || targetRowIndex + rowSpan > tableSlots.length) {
      setDraggedEventInfo(null);
      return;
    }

    const sourceStartIdx = tableSlots.findIndex(s => s[0] === sourceStartTime);

    const allEvents = [...loadedScheduleEvents, ...eventData];

    // Identificar los eventos movidos y los slots de destino
    const movingEvents = allEvents.filter(evt => {
      const isTargetSubject = evt.daysOfWeek.includes(sourceDay) &&
        evt.title === title &&
        evt.extendedProps.classroomId === classroomId &&
        evt.extendedProps.seccion === seccion &&
        evt.extendedProps.pnfName === pnfName;

      if (!isTargetSubject) return false;
      const evtStartIdx = tableSlots.findIndex(s => s[0] === evt.startTime);
      return evtStartIdx >= sourceStartIdx && evtStartIdx < sourceStartIdx + rowSpan;
    });

    if (movingEvents.length === 0) {
      setDraggedEventInfo(null);
      return;
    }

    const targetSlots = tableSlots.slice(targetRowIndex, targetRowIndex + rowSpan);
    const targetSlotStarts = targetSlots.map(s => s[0]);
    const firstMovingEvent = movingEvents[0];
    const profId = firstMovingEvent.extendedProps.professorId;
    const trayId = firstMovingEvent.extendedProps.trayectoId;

    // --- REVISIÓN DE RESTRICCIONES Y CONFLICTOS ---
    let conflictFound = false;

    // 1. Conflictos de profesor, sección y aula
    for (const evt of allEvents) {
      if (movingEvents.includes(evt)) continue; // Ignorar el propio evento que se mueve
      if (!evt.daysOfWeek.includes(targetDay)) continue;

      if (targetSlotStarts.includes(evt.startTime)) {
        const sameClassroom = evt.extendedProps.classroomId === classroomId;
        const sameProf = profId && evt.extendedProps.professorId === profId;
        const sameSection = evt.extendedProps.seccion === seccion && evt.extendedProps.pnfName === pnfName && evt.extendedProps.trayectoId === trayId;

        if (sameClassroom) {
          message.error(`El aula ya está ocupada por "${evt.title}" a las ${evt.startTime}.`);
          conflictFound = true; break;
        }
        if (sameProf) {
          message.error(`El profesor ya da clase de "${evt.title}" a las ${evt.startTime}.`);
          conflictFound = true; break;
        }
        if (sameSection) {
          message.error(`La sección ya ve "${evt.title}" a las ${evt.startTime}.`);
          conflictFound = true; break;
        }
      }
    }

    // 2. Restricciones del Profesor (Días y Horas)
    if (profId && !conflictFound) {
      const profRest = teacherRestrictions.find(r => r.teacherId === profId);
      if (profRest) {
        if (profRest.days?.includes(targetDay)) {
          message.error("El profesor no tiene disponibilidad este día de la semana.");
          conflictFound = true;
        } else {
          const restrictedTime = profRest.hours?.find(h => h.day === targetDay && targetSlotStarts.includes(h.start));
          if (restrictedTime) {
            message.error(`El profesor tiene la hora de las ${restrictedTime.start} restringida este día.`);
            conflictFound = true;
          }
        }
      }
    }

    const pinDraggedEventsAndRecalculate = () => {
      const newPinnedEvents = movingEvents.map((evt, idx) => {
        const newSlot = targetSlots[idx];
        return {
          ...evt,
          daysOfWeek: [targetDay],
          startTime: newSlot[0],
          endTime: newSlot[1]
        };
      });

      // Remover cualquier versión previa de esta misma sección de los eventos clavados (pinned)
      setLoadedScheduleEvents(prev => [
        ...prev.filter(e => !(e.title === title && e.extendedProps.pnfName === pnfName && e.extendedProps.seccion === seccion)),
        ...newPinnedEvents
      ]);
      setGenerationCounter(prev => prev + 1);
    };

    if (conflictFound) {
      Modal.confirm({
        title: "Conflicto de Horario Detectado",
        content: `La posición que deseas asignar tiene conflictos o restricciones ocupadas. ¿Deseas forzar el cambio de todos modos y recalcular automáticamente el resto del horario alrededor de esta nueva posición?`,
        okText: "Sí, forzar y recalcular",
        cancelText: "Deshacer",
        okButtonProps: { danger: true },
        onOk: () => {
          pinDraggedEventsAndRecalculate();
          setDraggedEventInfo(null);
        },
        onCancel: () => {
          setDraggedEventInfo(null);
        }
      });
      return;
    }

    // Si no hay conflicto, igual lo anclamos para que soporte futuros recálculos sin perderse
    pinDraggedEventsAndRecalculate();
    setDraggedEventInfo(null);

  };

  const handleViewModeChange = (mode: "pnf" | "professor" | "classroom") => {
    setViewMode(mode);
    // Reset states when switching views
    if (mode === "pnf") {
      setSelectedProfessorId(null);
      setSelectedClassroomId(null);
      // Trigger re-evaluation of defaults
      setPnf("");
      setTrayectoId("");
      setSeccion("");
    } else if (mode === "professor") {
      setPnf("");
      setTrayectoId("");
      setSeccion("");
      setSelectedClassroomId(null);
      setSelectedProfessorId(null);
    } else {
      // classroom
      setPnf("");
      setTrayectoId("");
      setSeccion("");
      setSelectedProfessorId(null);
      setSelectedClassroomId(null);
    }
  };

  return (
    <>
      <div className="schedule-select-main-container">
        <div className="schedule-select-container">
          {/* TABS FOR VIEW MODE */}
          <div className="view-mode-tabs">
            <div
              className={`view-mode-tab ${viewMode === "pnf" ? "active" : ""}`}
              onClick={() => handleViewModeChange("pnf")}>
              Por PNF
            </div>
            <div
              className={`view-mode-tab ${viewMode === "professor" ? "active" : ""}`}
              onClick={() => handleViewModeChange("professor")}>
              Por Profesor
            </div>
            <div
              className={`view-mode-tab ${viewMode === "classroom" ? "active" : ""}`}
              onClick={() => handleViewModeChange("classroom")}>
              Por Aula
            </div>
          </div>

          {viewMode === "pnf" && (
            <>
              <div className="schedule-select">
                <span>Turno:</span>
                <Select
                  size="small"
                  value={turn}
                  style={{ width: 120 }}
                  onChange={(newTurn) => {
                    setTurn(newTurn);
                    const availableSections = Array.from(
                      new Set(
                        (subjects || [])
                          .filter(
                            (s) =>
                              (!pnf || s.pnfId === pnf) &&
                              (!trayectoId || s.trayectoId === trayectoId) &&
                              (!newTurn || s.turnoName?.toLowerCase() === newTurn)
                          )
                          .map((s) => s.seccion)
                      )
                    ).sort();

                    if (availableSections.length > 0) {
                      setSeccion(availableSections[0]);
                    }
                  }}
                  options={Object.keys(activeTurnos).map((turn) => ({ value: turn, label: turn }))}
                />
              </div>

              <div className="schedule-select">
                <span>Sección:</span>
                <Select
                  size="small"
                  value={seccion}
                  style={{ width: 120 }}
                  onChange={setSeccion}
                  options={Array.from(
                    new Set(
                      (subjects || [])
                        .filter(
                          (s) =>
                            (!pnf || s.pnfId === pnf) &&
                            (!trayectoId || s.trayectoId === trayectoId) &&
                            (!turn || s.turnoName?.toLowerCase() === turn)
                        )
                        .map((s) => s.seccion)
                    )
                  )
                    .sort()
                    .map((seccion) => ({
                      value: seccion,
                      label: `Sección ${seccion}`,
                    }))}
                />
              </div>

              <div className="schedule-select">
                <span>PNF:</span>
                <Select
                  size="small"
                  value={pnf}
                  style={{ width: 250 }}
                  onChange={setPnf}
                  options={Array.from(
                    new Map(
                      (subjects || [])
                        .filter((subject) => subject.pnfId && subject.pnf && subject.pnf !== "ADMIN")
                        .map((subject) => [subject.pnfId, subject.pnf])
                    )
                  ).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>

              <div className="schedule-select">
                <span>Trayecto:</span>
                <Select
                  size="small"
                  value={trayectoId}
                  style={{ width: 180 }}
                  onChange={setTrayectoId}
                  options={(trayectosList || [])
                    .slice()
                    .sort((a, b) => {
                      const nameA = a.name.toUpperCase();
                      const nameB = b.name.toUpperCase();
                      const isInicialA = nameA.includes("INICIAL");
                      const isInicialB = nameB.includes("INICIAL");

                      if (isInicialA && !isInicialB) return -1;
                      if (!isInicialA && isInicialB) return 1;

                      return nameA.localeCompare(nameB);
                    })
                    .map((trayecto) => ({
                      value: trayecto.id,
                      label: trayecto.name,
                    }))}
                />
              </div>
              <div className="schedule-select">
                <span>Trimestre:</span>
                <Select
                  size="small"
                  value={trimestre}
                  style={{ width: 150 }}
                  onChange={(e) => {
                    setErrors([]);
                    setTrimestre(e);
                  }}
                  options={[
                    { value: "q1", label: "Trimestre 1" },
                    { value: "q2", label: "Trimestre 2" },
                    { value: "q3", label: "Trimestre 3" },
                  ]}
                />
              </div>
            </>
          )}

          {viewMode === "professor" && (
            <>
              <div className="schedule-select">
                <span>Profesor:</span>
                <Select
                  size="small"
                  showSearch
                  value={selectedProfessorId}
                  placeholder="Seleccione un profesor"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: 500 }}
                  onChange={setSelectedProfessorId}
                  options={teachers?.map((teacher) => ({
                    value: teacher.id,
                    label: `${teacher.name} ${teacher.lastName}`,
                  }))}
                />
              </div>
              <div className="schedule-select">
                <span>Trimestre:</span>
                <Select
                  size="small"
                  value={trimestre}
                  style={{ width: 150 }}
                  onChange={(e) => {
                    setErrors([]);
                    setTrimestre(e);
                  }}
                  options={[
                    { value: "q1", label: "Trimestre 1" },
                    { value: "q2", label: "Trimestre 2" },
                    { value: "q3", label: "Trimestre 3" },
                  ]}
                />
              </div>
            </>
          )}

          {viewMode === "classroom" && (
            <>
              <div className="schedule-select">
                <span>Aula:</span>
                <Select
                  size="small"
                  showSearch
                  value={selectedClassroomId}
                  placeholder="Seleccione un aula"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: 250 }}
                  onChange={setSelectedClassroomId}
                  options={(classrooms || [])
                    .slice()
                    .sort((a, b) =>
                      a.classroom.localeCompare(b.classroom, undefined, { numeric: true, sensitivity: "base" })
                    )
                    .map((classroom) => ({
                      value: classroom.id,
                      label: classroom.classroom,
                    }))}
                />
              </div>

              <div className="schedule-select">
                <span>Trimestre:</span>
                <Select
                  size="small"
                  value={trimestre}
                  style={{ width: 150 }}
                  onChange={(e) => {
                    setErrors([]);
                    setTrimestre(e);
                  }}
                  options={[
                    { value: "q1", label: "Trimestre 1" },
                    { value: "q2", label: "Trimestre 2" },
                    { value: "q3", label: "Trimestre 3" },
                  ]}
                />
              </div>
            </>
          )}

          <div className="schedule-actions">
            <FaPlus title="Nuevo Horario" className={styles.icon} onClick={newSchedule} />
            <FaRegFolderOpen title="Abrir Horarios" className={styles.icon} onClick={openSchedule} />
            <FaRegSave title="Guardar Horario" className={styles.icon} onClick={saveSchedule} />
            <FaPrint title="Imprimir Horario" className={styles.icon} onClick={handlePrint} />
            <TeacherRestrictionModal
              putTeacherRestriction={putTeacherRestriction}
              teacherRestrictions={teacherRestrictions}
              loadingTeacherRestrictions={!teacherRestrictionsReady}
              scheduleTurnos={activeTurnos}
              scheduleDays={activeDays}
              externalOpen={!!editingTeacherId}
              externalTeacherId={editingTeacherId || undefined}
              onExternalClose={() => setEditingTeacherId(null)}
            />
            <SubjectRestrictionModal
              putSubjectRestriction={putSubjectRestriction}
              classrooms={classrooms}
              onClassroomCreated={loadClassrooms}
              subjectRestrictions={subjectRestriction}
              loadingSubjectRestrictions={!subjectRestrictionsReady}
            />
            <TeachersRestrictionsListModal
              restrictions={teacherRestrictions}
              onEditTeacher={(teacherId) => setEditingTeacherId(teacherId)}
            />

            <ScheduleErrorsModal errors={errors} onForceInsert={handleForceInsert} />
            <FaCog title="Configuración" className={styles.icon} onClick={() => setIsConfigModalOpen(true)} />
            <ScheduleConfigModal
              visible={isConfigModalOpen}
              onClose={() => setIsConfigModalOpen(false)}
              onConfigUpdate={(newConfig) => setScheduleConfig(newConfig)}
            />
          </div>
        </div>

        <div className="schedule-content-wrapper">
          <div className={`calendar-container view-${viewMode}`} style={{ padding: "0", overflowY: "auto" }}>
            {tableSlots.length > 0 ? (
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #dee2e6",
                fontSize: "0.85rem",
                tableLayout: "fixed"
              }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 5, backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <tr>
                    <th style={{ border: "1px solid #dee2e6", padding: "12px", width: "100px", textAlign: "center", color: "#495057", backgroundColor: "#f8f9fa" }}>HORA</th>
                    {(scheduleConfig?.days || [1, 2, 3, 4, 5]).map(day => (
                      <th key={day} style={{ border: "1px solid #dee2e6", padding: "12px", textAlign: "center", color: "#495057", backgroundColor: "#f8f9fa", textTransform: "uppercase" }}>
                        {["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableSlots.map((slot, rowIndex) => {
                    const formatTime = (t: string) => {
                      // Format HH:MM to readable string if needed, or keeping it as is 
                      // The input is already HH:MM
                      return t;
                    };

                    return (
                      <tr key={rowIndex} style={{ height: "1px" /* let content dictate height, but min-height via css */ }}>
                        <td

                          style={{
                            border: "1px solid #dee2e6",
                            padding: "8px",
                            textAlign: "center",
                            fontWeight: "bold",
                            color: "#555",
                            backgroundColor: "#fff",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap"
                          }}>
                          {formatTime(slot[0])} <br /> - <br /> {formatTime(slot[1])}
                        </td>
                        {(scheduleConfig?.days || [1, 2, 3, 4, 5]).map((day) => {
                          const cell = tableGrid[rowIndex][day];
                          if (cell?.occupied) return null;

                          if (cell) {
                            const pnfId = cell.extendedProps?.pnfId;
                            const baseColor = (pnfId && subjectColors?.[pnfId]) || "#1a73e8";
                            const bgColor = hexToRgba(baseColor, 0.12);

                            const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                            const endTimeIndex = rowIndex + cell.rowSpan - 1;
                            const endTime = tableSlots[endTimeIndex] ? tableSlots[endTimeIndex][1] : "";

                            const tooltipContent = (
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{cell.title}</div>
                                <div>{`${tableSlots[rowIndex][0]} - ${endTime}`}</div>
                                <div>{dayNames[day]}</div>
                              </div>
                            );

                            const contextMenuItems: MenuProps["items"] = [
                              {
                                key: "change-classroom",
                                icon: <SwapOutlined />,
                                label: "Cambiar Aula",
                                onClick: () => {
                                  const endTimeIdx = rowIndex + cell.rowSpan - 1;
                                  const evtEndTime = tableSlots[endTimeIdx] ? tableSlots[endTimeIdx][1] : "";
                                  setClassroomChangeEvent({
                                    eventIndex: rowIndex,
                                    day,
                                    startTime: slot[0],
                                    endTime: evtEndTime,
                                    title: cell.title,
                                    currentClassroomId: cell.extendedProps?.classroomId || "",
                                    currentClassroomName: cell.extendedProps?.classroomName || "",
                                  });
                                  setNewClassroomId(cell.extendedProps?.classroomId || "");
                                },
                              },
                            ];

                            return (
                              <td
                                className="schedule-time-cell"
                                key={day}
                                rowSpan={cell.rowSpan}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", cell.title || "");
                                  setDraggedEventInfo({
                                    sourceDay: day,
                                    sourceStartTime: slot[0],
                                    rowSpan: cell.rowSpan,
                                    title: cell.title || "",
                                    classroomId: cell.extendedProps?.classroomId || "",
                                    seccion: cell.extendedProps?.seccion || "",
                                    pnfName: cell.extendedProps?.pnfName || "",
                                  });
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDrop(rowIndex, day);
                                }}
                                style={{
                                  border: "1px solid #dee2e6",
                                  padding: "6px",
                                  verticalAlign: "top",
                                  backgroundColor: bgColor,
                                  borderLeft: `4px solid ${baseColor}`,
                                  height: "100%",
                                  cursor: "grab",
                                  opacity: draggedEventInfo?.title === cell.title && draggedEventInfo?.sourceDay === day && draggedEventInfo?.sourceStartTime === slot[0] ? 0.3 : 1
                                }}
                              >
                                <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
                                  <Tooltip title={tooltipContent}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", height: "100%", cursor: "context-menu" }}>
                                      <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#212529", lineHeight: "1.2", marginBottom: "4px" }}>
                                        {cell.title}
                                      </div>

                                      {/* Chip for PNF/Section/Classroom */}
                                      <div style={{ display: "flex", flexDirection: "column", flexWrap: "wrap", gap: "4px", marginBottom: "4px" }}>

                                        {cell.extendedProps?.classroomName && viewMode !== "classroom" && (
                                          <div style={{ fontSize: "0.65rem", padding: "1px 5px", color: "#333" }}>
                                            <span style={{ fontWeight: "600" }}></span> {cell.extendedProps.classroomName}
                                          </div>
                                        )}

                                        {(viewMode === "professor" || viewMode === "classroom") && (
                                          <div style={{ fontSize: "0.65rem", padding: "1px 5px", color: "#333", display: "flex", flexDirection: "column" }}>
                                            <span>
                                              <span style={{ fontWeight: "600" }}></span> {cell.extendedProps?.pnfName}
                                            </span>
                                            <span>
                                              <span style={{ fontWeight: "600" }}>Sec:</span> {cell.extendedProps?.seccion}
                                              {cell.extendedProps?.trayectoName && (
                                                <> | <span style={{ fontWeight: "600" }}>{cell.extendedProps.trayectoName}</span></>
                                              )}
                                            </span>
                                          </div>
                                        )}

                                        {/* Professor Name */}
                                        {viewMode !== "professor" && (
                                          (() => {
                                            const profId = cell.extendedProps?.professorId;
                                            if (!profId) return (
                                              <div style={{ fontSize: "0.75rem", color: "#999" }}>Sin Profesor Asignado</div>
                                            );
                                            const prof = teachers?.find((t: any) => t.id === profId);
                                            if (!prof || prof.is_placeholder) return (
                                              <div style={{ fontSize: "0.75rem", color: "#999" }}>Sin Profesor Asignado</div>
                                            );
                                            const fullName = `${prof.name || ""} ${prof.lastName || ""}`.trim();
                                            const academicTitle = prof.title || "Profesor";
                                            return (
                                              <div style={{ fontSize: "0.75rem", color: "#495057" }}>
                                                <span style={{ fontWeight: "600" }}>{academicTitle}:</span> {fullName || "Sin Profesor Asignado"}
                                              </div>
                                            );
                                          })()
                                        )}
                                      </div>
                                    </div>
                                  </Tooltip>
                                </Dropdown>
                              </td>
                            );
                          } else {
                            return <td key={day} style={{ border: "1px solid #dee2e6" }}
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                              onDrop={(e) => { e.preventDefault(); handleDrop(rowIndex, day); }}
                            ></td>;
                          }
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                No hay horarios configurados para este turno
              </div>
            )}
          </div>

          {/* Hidden Printable Schedule */}
          <div
            style={{ display: "block", position: "absolute", left: "-10000px", width: "0px", height: "0px" }}>
            <div ref={printableRef}>
              <PrintableSchedule
                events={events}
                viewMode={viewMode}
                turn={turn}
                headerInfo={getHeaderInfo()}
                seccion={seccion}
                activeTurnos={activeTurnos}
                headerText={scheduleConfig?.header_text}
                logoUrl={scheduleConfig?.logo_url}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="Abrir Horario Guardado"
        open={isScheduleModalOpen}
        onOk={handleOpenScheduleOk}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          setSelectedSchedule(null);
        }}
        okText="Abrir Horario"
        cancelText="Cancelar">
        <p>Selecciona un horario de la lista para cargarlo:</p>

        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          <List
            size="small"
            bordered
            dataSource={[...scheduleList].reverse()}
            renderItem={(schedule: ScheduleDataBase) => (
              <List.Item
                style={{
                  cursor: "pointer",
                  backgroundColor: selectedSchedule?.id === schedule.id ? "#e6f7ff" : "transparent",
                }}
                onClick={() => setSelectedSchedule(schedule || null)}>
                {schedule.name}
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {/* Modal for changing classroom */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SwapOutlined style={{ color: "#1890ff" }} />
            <span>Cambiar Aula</span>
          </div>
        }
        open={!!classroomChangeEvent}
        onOk={handleChangeClassroom}
        onCancel={() => {
          setClassroomChangeEvent(null);
          setNewClassroomId("");
        }}
        okText="Cambiar"
        cancelText="Cancelar"
        okButtonProps={{ disabled: !newClassroomId || newClassroomId === classroomChangeEvent?.currentClassroomId }}
      >
        {classroomChangeEvent && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              backgroundColor: "#f0f5ff",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d6e4ff",
            }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
                {classroomChangeEvent.title}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#595959" }}>
                {["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][classroomChangeEvent.day]} • {classroomChangeEvent.startTime} - {classroomChangeEvent.endTime}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#8c8c8c", marginTop: "4px" }}>
                Aula actual: <strong>{classroomChangeEvent.currentClassroomName}</strong>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>
                Nueva aula:
              </label>
              <Select
                style={{ width: "100%" }}
                value={newClassroomId || undefined}
                placeholder="Seleccione un aula"
                onChange={(value) => setNewClassroomId(value)}
                showSearch
                optionFilterProp="label"
                options={classrooms.map(c => ({
                  value: c.id,
                  label: c.classroom,
                }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default SchoolSchedule;

