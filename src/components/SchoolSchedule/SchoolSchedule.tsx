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
import { Select, Modal, message, List, Tooltip, Dropdown, Spin, Button, Badge, Checkbox } from "antd";
import { SwapOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { generateScheduleEvents, mergeConsecutiveEvents, turnos, Classroom, Event } from "./fucntions";
import TeacherRestrictionModal from "./TeacherRestrictionModal";
import SubjectRestrictionModal from "./SubjectRestrictionModal";
import TeachersRestrictionsListModal from "./TeachersRestrictionsListModal";
import ScheduleErrorsModal, { scheduleError } from "./ErrorsModal";
import { FaRegSave, FaRegFolderOpen, FaPlus, FaCog, FaPrint } from "react-icons/fa";
import { TbPinFilled } from "react-icons/tb";
import { BsPinAngleFill } from "react-icons/bs";
import { FaBuildingLock } from "react-icons/fa6";
import { GiFrozenBlock } from "react-icons/gi";
import { useReactToPrint } from "react-to-print";
import PrintableSchedule from "./PrintableSchedule";

import styles from "./modal.module.css";
import { normalizeText } from "../../utils/textFilter";
import ScheduleConfigModal from "./ScheduleConfigModal";
import { getScheduleConfig, ScheduleConfig } from "../../fetch/schedule/scheduleConfigFetch";
import ClassroomManagerModal from "./ClassroomManagerModal";
import ClassroomOverridesModal from "./ClassroomOverridesModal";
import {
  getClassroomOverrides,
  saveClassroomOverrides,
  type ClassroomOverride,
} from "../../fetch/schedule/classroomOverrideFetch";


type RawSubjectRestriction = {
  subject_name?: string;
  subjectName?: string;
  subject_key?: string;
  subjectKey?: string;
  classroom_ids?: string[];
  classroomIds?: string[];
  pnf_id?: string;
  pnfId?: string;
  is_exclusive?: boolean;
  isExclusive?: boolean;
  split_hours?: boolean;
  splitHours?: boolean;
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
  const [turn, setTurn] = useState(() => localStorage.getItem("schedule_turn") || "mañana");
  const [seccion, setSeccion] = useState(() => localStorage.getItem("schedule_seccion") || "1");
  const [pnf, setPnf] = useState(() => localStorage.getItem("schedule_pnf") || "");
  const [trayectoId, setTrayectoId] = useState(() => localStorage.getItem("schedule_trayectoId") || "");
  const [teacherRestrictions, setTeacherRestrictions] = useState<TeacherRestriction[]>([]);
  const [teacherRestrictionsReady, setTeacherRestrictionsReady] = useState(false);
  const [subjectRestriction, setSubjectRestriction] = useState<SubjectRestriction[]>([]);
  const [subjectRestrictionsReady, setSubjectRestrictionsReady] = useState(false);
  const [trimestre, setTrimestre] = useState<"q1" | "q2" | "q3">(() => (localStorage.getItem("schedule_trimestre") as "q1" | "q2" | "q3") || "q1");
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

  const [frozenSections, setFrozenSections] = useState<Record<string, Event[]>>(() => {
    try {
      const stored = localStorage.getItem("schedule_frozenSections");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });
  const [isFrozenManagerOpen, setIsFrozenManagerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("schedule_frozenSections", JSON.stringify(frozenSections));
  }, [frozenSections]);


  const toggleFreezeSection = (pnfId: string, trayId: string, sec: string) => {
    const key = `${pnfId}-${trayId}-${sec}`;
    setFrozenSections(prev => {
      const newObj = { ...prev };
      if (newObj[key]) {
        delete newObj[key];
        message.info(`Sección ${sec} descongelada.`);
      } else {
        // Collect unmerged events for this section
        const sectionEvents = eventData.filter(e =>
          e.extendedProps.pnfId === pnfId &&
          e.extendedProps.trayectoId === trayId &&
          e.extendedProps.seccion === sec
        );
        newObj[key] = sectionEvents;
        message.success(`Sección ${sec} congelada.`);
      }
      return newObj;
    });
    setGenerationCounter(prev => prev + 1);
  };

  const toggleFreezeTrayecto = (pnfId: string, trayId: string, trayName: string, sections: string[], isCurrentlyFrozen: boolean) => {
    setFrozenSections(prev => {
      const newObj = { ...prev };
      if (isCurrentlyFrozen) {
        sections.forEach(sec => delete newObj[`${pnfId}-${trayId}-${sec}`]);
        message.info(`Trayecto ${trayName} descongelado.`);
      } else {
        sections.forEach(sec => {
          const key = `${pnfId}-${trayId}-${sec}`;
          if (!newObj[key]) {
            const sectionEvents = eventData.filter(e =>
              e.extendedProps.pnfId === pnfId &&
              e.extendedProps.trayectoId === trayId &&
              e.extendedProps.seccion === sec
            );
            newObj[key] = sectionEvents;
          }
        });
        message.success(`Trayecto ${trayName} congelado.`);
      }
      return newObj;
    });
    setGenerationCounter(prev => prev + 1);
  };

  const toggleFreezePnf = (pnfId: string, pnfName: string, sectionsMap: Array<{ trayId: string, sec: string }>, isCurrentlyFrozen: boolean) => {
    setFrozenSections(prev => {
      const newObj = { ...prev };

      if (isCurrentlyFrozen) {
        sectionsMap.forEach(({ trayId, sec }) => delete newObj[`${pnfId}-${trayId}-${sec}`]);
        message.info(`PNF ${pnfName} descongelado.`);
      } else {
        sectionsMap.forEach(({ trayId, sec }) => {
          const key = `${pnfId}-${trayId}-${sec}`;
          if (!newObj[key]) {
            const sectionEvents = eventData.filter(e =>
              e.extendedProps.pnfId === pnfId &&
              e.extendedProps.trayectoId === trayId &&
              e.extendedProps.seccion === sec
            );
            newObj[key] = sectionEvents;
          }
        });
        message.success(`PNF ${pnfName} congelado.`);
      }
      return newObj;
    });
    setGenerationCounter(prev => prev + 1);
  };

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
  const [viewMode, setViewMode] = useState<"pnf" | "professor" | "classroom">(() => (localStorage.getItem("schedule_viewMode") as "pnf" | "professor" | "classroom") || "pnf");
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(() => localStorage.getItem("schedule_selectedClassroomId") || null);
  const [profPnf, setProfPnf] = useState(() => localStorage.getItem("schedule_profPnf") || "");
  const [scrollToProfessorId, setScrollToProfessorId] = useState<string | null>(() => localStorage.getItem("schedule_scrollToProfessorId") || null);
  const [isScrollingToProf, setIsScrollingToProf] = useState<boolean>(() => localStorage.getItem("schedule_viewMode") === "professor" && !!localStorage.getItem("schedule_scrollToProfessorId"));
  const [isScrollingToClassroom, setIsScrollingToClassroom] = useState<boolean>(() => localStorage.getItem("schedule_viewMode") === "classroom" && !!localStorage.getItem("schedule_selectedClassroomId"));
  const hasScrolledRef = useRef<boolean>(false);
  const [printEntityId, setPrintEntityId] = useState<string | null>(null);
  //const [, setIsGeneratingPdf] = useState(false);

  const triggerPrint = (id: string) => {
    setPrintEntityId(id);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  /*const triggerDownload = (id: string) => {
    setPrintEntityId(id);
    setTimeout(() => {
      handleDownloadPdf();
    }, 100);
  };*/

  // Persist selections in localStorage when they change
  useEffect(() => {
    localStorage.setItem("schedule_turn", turn);
    localStorage.setItem("schedule_seccion", seccion);
    localStorage.setItem("schedule_pnf", pnf);
    localStorage.setItem("schedule_trayectoId", trayectoId);
    localStorage.setItem("schedule_trimestre", trimestre);
    localStorage.setItem("schedule_viewMode", viewMode);

    if (selectedClassroomId) localStorage.setItem("schedule_selectedClassroomId", selectedClassroomId);
    else localStorage.removeItem("schedule_selectedClassroomId");

    if (profPnf) localStorage.setItem("schedule_profPnf", profPnf);
    else localStorage.removeItem("schedule_profPnf");

    if (scrollToProfessorId) localStorage.setItem("schedule_scrollToProfessorId", scrollToProfessorId);
    else localStorage.removeItem("schedule_scrollToProfessorId");
  }, [turn, seccion, pnf, trayectoId, trimestre, viewMode, selectedClassroomId, profPnf, scrollToProfessorId]);

  const activeTurnos = useMemo(() => {
    const base = scheduleConfig?.turnos || turnos;

    // Filtrar slots inválidos (duración cero donde start === end)
    const sanitized: Record<string, [string, string][]> = {};
    for (const [key, slots] of Object.entries(base)) {
      sanitized[key] = (slots as [string, string][]).filter(
        ([start, end]) => start !== end
      );
    }

    // Build "diurno" carefully. Mañana and Tarde are the primary sources of truth.
    // We only keep slots from the saved diurno config if they don't overlap 
    // with any mañana/tarde slots. This handles the case where diurno has 
    // "extra" hours but prevents duplicate rows when times are slightly off.
    if (sanitized.mañana || sanitized.tarde) {
      const masterSlots = [...(sanitized.mañana || []), ...(sanitized.tarde || [])];

      // Helper to check if two time ranges overlap
      const isOverlap = (s1: string, e1: string, s2: string, e2: string) => {
        return s1 < e2 && e1 > s2;
      };

      // Filter saved diurno: keep only slots that are NOT overlapping with mañana/tarde
      const diurnoExtras = (sanitized.diurno || []).filter(([dStart, dEnd]) => {
        const overlaps = masterSlots.some(([mStart, mEnd]) => isOverlap(dStart, dEnd, mStart, mEnd));
        return !overlaps;
      });

      const slotSet = new Set<string>();
      // Always include master (mañana/tarde) slots
      masterSlots.forEach(slot => slotSet.add(JSON.stringify(slot)));
      // Include non-overlapping diurno extras
      diurnoExtras.forEach(slot => slotSet.add(JSON.stringify(slot)));

      sanitized.diurno = Array.from(slotSet)
        .map(s => JSON.parse(s) as [string, string])
        .sort((a, b) => a[0].localeCompare(b[0]));
    }

    return sanitized;
  }, [scheduleConfig]);
  const activeDays = scheduleConfig?.days || [1, 2, 3, 4, 5];
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDataBase | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState<ScheduleDataBase[]>([]);
  const [loadedScheduleEvents, setLoadedScheduleEvents] = useState<Event[]>([]); // Eventos del horario cargado
  const [activeScheduleName, setActiveScheduleName] = useState<string>("Horario fresco");

  // Classroom overrides state
  const [classroomOverrides, setClassroomOverrides] = useState<ClassroomOverride[]>([]);
  const [isOverridesModalOpen, setIsOverridesModalOpen] = useState(false);
  const [hasUnsavedOverrides, setHasUnsavedOverrides] = useState(false);

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
        `${s.innerId}| ${s.pnfId}| ${s.trayectoId}| ${s.seccion}| ${s.turnoName}| ${s.subject}| ${JSON.stringify(s.quarter)}| ${JSON.stringify(s.hours)} `
      )
      .sort()
      .join("||");
  }, [schedulableSubjects]);

  // Helper to get names for the header
  const getHeaderInfo = () => {
    const trimestreLabel =
      trimestre === "q1" ? "Trimestre 1" : trimestre === "q2" ? "Trimestre 2" : "Trimestre 3";

    if (viewMode === "professor") {
      if (printEntityId) {
        const t = teachers?.find((t: any) => String(t.id) === String(printEntityId));
        return `Horario del Profesor ${t ? `${t.name} ${t.lastName}` : printEntityId}, ${trimestreLabel}`;
      }
      return `Horario para todos los profesores, ${trimestreLabel}`;
    } else if (viewMode === "classroom") {
      const cId = printEntityId || selectedClassroomId;
      const classroom = classrooms?.find((c) => String(c.id) === String(cId));
      const classroomName = classroom ? classroom.classroom : "Aula no seleccionada";
      return `Horario del Aula ${classroomName.replace("Aula ", "")}, ${trimestreLabel} `;
    } else {
      const pnfNameFound =
        eventData.find((e) => e.extendedProps.pnfId === pnf)?.extendedProps.pnfName || "PNF";
      const trayectoName = trayectosList?.find((t) => t.id === trayectoId)?.name || "Trayecto";
      return `Horario de ${pnfNameFound}, ${trayectoName}, ${trimestreLabel}, Turno ${turn} `;
    }
  };

  // react-to-print hook
  const handlePrint = useReactToPrint({
    contentRef: printableRef,
    documentTitle: getHeaderInfo(),
    onAfterPrint: () => setPrintEntityId(null),
    onPrintError: () => setPrintEntityId(null),
  });

  /*const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    const element = printableRef.current;

    setIsGeneratingPdf(true);
    message.loading({ content: 'Generando PDF (esto puede tomar un minuto)...', key: 'pdfGen', duration: 0 });

    try {
      // @ts-ignore
      const html2canvas = (await import('html2canvas')).default;
      // @ts-ignore
      const { jsPDF } = await import('jspdf');

      const opt = {
        margin: 3, // mm
        width: 279, // letter landscape width mm
        height: 216 // letter landscape height mm
      };

      const pages = Array.from(element.getElementsByClassName('printable-page')) as HTMLElement[];
      if (pages.length === 0) {
        throw new Error("No hay páginas para generar.");
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Wait a small moment to let the browser breathe between heavy canvas operations
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (i > 0) {
          pdf.addPage();
        }

        // Adjust dimensions maintaining aspect ratio to fit the page considering margins
        const pdfWidth = opt.width - (opt.margin * 2);
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', opt.margin, opt.margin, pdfWidth, Math.min(pdfHeight, opt.height - (opt.margin * 2)));
      }

      pdf.save(`${getHeaderInfo().replace(/ /g, '_')}.pdf`);
      message.success({ content: 'PDF descargado exitosamente!', key: 'pdfGen', duration: 2 });
    } catch (e) {
      console.error(e);
      message.error({ content: 'Error al generar el PDF', key: 'pdfGen', duration: 3 });
    } finally {
      setIsGeneratingPdf(false);
      setPrintEntityId(null);
    }
  };*/

  const loadClassrooms = useCallback(async (): Promise<void> => {
    const classroomsData = await getClassrooms();
    if (classroomsData.error) {
      console.error(classroomsData.message);
      return;
    }
    // Normalize active state to boolean
    const normalized = (classroomsData || []).map((c: any) => ({
      ...c,
      active: c.active !== false && c.active !== 0 && c.active !== "0" && c.active !== "false"
    }));
    setClassrooms(normalized);
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
          // Use the stored key directly — it now contains the compound key with trayecto info
          // (format: "subjectname_t_trayectoname")
          const subjectKey = item?.subject_key ?? item?.subjectKey ?? (subjectName ? normalizeText(subjectName) : "");

          const classroomIds = item?.classroom_ids ?? item?.classroomIds ?? [];
          const pnfId = item?.pnf_id ?? item?.pnfId;
          const isExclusive = item?.is_exclusive ?? item?.isExclusive ?? false;
          const splitHours = item?.split_hours ?? item?.splitHours ?? false;

          if (!subjectKey) return null;

          return {
            subjectKey,
            subjectName: subjectName || subjectKey,
            classroomIds,
            pnfId: pnfId || undefined,
            isExclusive: Boolean(isExclusive),
            splitHours: Boolean(splitHours),
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
          is_exclusive: rest.isExclusive,
          split_hours: rest.splitHours,
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

  // ─── Classroom Overrides: cargar al inicio ───
  const loadClassroomOverrides = useCallback(async () => {
    if (!proyectionId) return;
    try {
      const response = await getClassroomOverrides(proyectionId);
      if (response?.error) return;
      const loaded = Array.isArray(response?.overrides) ? response.overrides : [];
      setClassroomOverrides(loaded);
      setHasUnsavedOverrides(false);
    } catch (err) {
      console.error("Error loading classroom overrides:", err);
    }
  }, [proyectionId]);

  useEffect(() => {
    loadClassroomOverrides();
  }, [loadClassroomOverrides]);

  // Set de overrides activos para mostrar el pin icon
  const overrideKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const ov of classroomOverrides) {
      keys.add(`${ov.subject_name}|${ov.day}|${ov.start_time}`);
    }
    return keys;
  }, [classroomOverrides]);

  const groupedOverridesCount = useMemo(() => {
    const timeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const sorted = [...classroomOverrides].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.subject_name !== b.subject_name) return a.subject_name.localeCompare(b.subject_name);
      return a.start_time.localeCompare(b.start_time);
    });

    let count = 0;
    let lastGroup: { key: string; end_time: string } | null = null;

    for (const ov of sorted) {
      const matchKey = `${ov.subject_name}|${ov.day}|${ov.classroom_id}|${ov.seccion || ''}|${ov.pnf_id || ''}|${ov.trayecto_id || ''}`;
      const isSameGroup = lastGroup && lastGroup.key === matchKey;
      const gapMinutes = isSameGroup ? timeToMinutes(ov.start_time) - timeToMinutes(lastGroup!.end_time) : Infinity;

      if (isSameGroup && gapMinutes >= 0 && gapMinutes <= 30) {
        lastGroup!.end_time = ov.end_time;
      } else {
        count++;
        lastGroup = { key: matchKey, end_time: ov.end_time };
      }
    }

    return count;
  }, [classroomOverrides]);

  const handleSaveOverrides = async () => {
    if (!proyectionId) {
      message.error("No se pudo identificar la proyección");
      return;
    }
    try {
      const response = await saveClassroomOverrides(proyectionId, classroomOverrides);
      if (response?.error) {
        message.error("Error al guardar los cambios de aula");
        return;
      }
      message.success("Cambios de aula guardados exitosamente");
      setHasUnsavedOverrides(false);
    } catch (err) {
      console.error("Error salvando overrides:", err);
      message.error("Error al guardar los cambios de aula");
    }
  };

  const handleDeleteOverrides = async (overridesToDelete: ClassroomOverride[]) => {
    const newOverrides = classroomOverrides.filter((o) => !overridesToDelete.includes(o));
    setClassroomOverrides(newOverrides);
    setGenerationCounter((prev) => prev + 1);

    // Guardar directamente en la base de datos
    if (proyectionId) {
      try {
        await saveClassroomOverrides(proyectionId, newOverrides);
        message.success(`Cambio${overridesToDelete.length > 1 ? 's' : ''} de aula eliminado${overridesToDelete.length > 1 ? 's' : ''}`);
        setHasUnsavedOverrides(false);
      } catch (err) {
        console.error(err);
        message.error("Error al guardar los cambios");
        setHasUnsavedOverrides(true);
      }
    }
  };

  const handleDeleteAllOverrides = () => {
    Modal.confirm({
      title: "Eliminar todos los cambios de aula",
      content: "¿Estás seguro de que deseas eliminar todos los cambios de aula fijados?",
      okText: "Sí, eliminar todos",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        setClassroomOverrides([]);
        setGenerationCounter((prev) => prev + 1);

        if (proyectionId) {
          try {
            await saveClassroomOverrides(proyectionId, []);
            message.success("Todos los cambios de aula eliminados");
            setHasUnsavedOverrides(false);
          } catch (err) {
            console.error(err);
            message.error("Error al guardar los cambios");
            setHasUnsavedOverrides(true);
          }
        }
      },
    });
  };

  const handleForceInsert = useCallback((errorInfo: scheduleError, ignoreRestrictions: boolean = true) => {
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

    const professorId = errorInfo.professorId || subject.quarter[trimestre] || null;
    const sectionKey = `${subject.pnfId} -${subject.trayectoId} -${subject.seccion} `;
    const allEvents = [...loadedScheduleEvents, ...eventData];
    const hoursNeeded = errorInfo.totalHours || subject.hours[trimestre] || 0;

    if (hoursNeeded <= 0) {
      message.error("Esta materia no tiene horas pendientes por asignar.");
      return;
    }

    const preventSingleBlocksGlobal = !!scheduleConfig?.prevent_single_hour_blocks;

    // Determine which days and classrooms to use
    const defaultDays = scheduleConfig?.days || [1, 2, 3, 4, 5];
    const activeClassrooms = classrooms.filter(c => c.active !== false);
    const profRestriction = teacherRestrictions.find(r => String(r.teacherId) === String(professorId));
    const profDays = profRestriction?.days ? defaultDays.filter(d => !new Set(profRestriction.days).has(d)) : defaultDays;

    const subPrefKey = `${normalizeText(subject.subject)}_t_${normalizeText(subject.trayectoName || "")}`;
    const subPref = subjectRestriction.find(r => r.subjectKey === subPrefKey);
    const prefClassrooms = (subPref?.classroomIds?.length || 0) > 0 ? activeClassrooms.filter(c => subPref!.classroomIds!.includes(c.id)) : activeClassrooms;

    // --- Core Search Function ---
    const executeSearch = (days: number[], targetClassrooms: Classroom[], forceConsecutive: boolean) => {
      // 1. Build occupancy map
      const occupancy = new Map<string, { professorIds: Set<string>; classroomIds: Set<string>; sectionKeys: Set<string>; }>();
      for (const evt of allEvents) {
        if (!evt.daysOfWeek?.length || !evt.startTime) continue;
        const key = `${evt.daysOfWeek[0]} -${evt.startTime} `;
        if (!occupancy.has(key)) occupancy.set(key, { professorIds: new Set(), classroomIds: new Set(), sectionKeys: new Set(), });
        const occ = occupancy.get(key)!;
        if (evt.extendedProps?.professorId) occ.professorIds.add(String(evt.extendedProps.professorId));
        if (evt.extendedProps?.classroomId) occ.classroomIds.add(String(evt.extendedProps.classroomId));
        const sk = `${evt.extendedProps?.pnfId} -${evt.extendedProps?.trayectoId} -${evt.extendedProps?.seccion} `;
        occ.sectionKeys.add(sk);
      }

      // 2. Find runs
      const runs: { day: number; startSlotIdx: number; slots: { slotIdx: number; classroom: Classroom }[] }[] = [];
      for (const day of days) {
        for (const cr of targetClassrooms) {
          if (cr.active === false) continue;
          let currentRun: any = null;
          let lastEnd: string | null = null;
          for (let idx = 0; idx < timeSlots.length; idx++) {
            const [start, end] = timeSlots[idx];
            const occ = occupancy.get(`${day} -${start} `);
            const conflict = (professorId && occ?.professorIds.has(String(professorId))) ||
              occ?.sectionKeys.has(sectionKey) ||
              occ?.classroomIds.has(String(cr.id));
            const isAvailable = !conflict;
            const isConsecutive = isAvailable && (lastEnd === null || lastEnd === start);
            if (isConsecutive) {
              if (!currentRun) currentRun = { day, startSlotIdx: idx, slots: [] };
              currentRun.slots.push({ slotIdx: idx, classroom: cr });
              lastEnd = end;
            } else {
              if (currentRun && currentRun.slots.length > 0) runs.push(currentRun);
              if (isAvailable) { currentRun = { day, startSlotIdx: idx, slots: [{ slotIdx: idx, classroom: cr }] }; lastEnd = end; }
              else { currentRun = null; lastEnd = null; }
            }
          }
          if (currentRun && currentRun.slots.length > 0) runs.push(currentRun);
        }
      }
      runs.sort((a, b) => b.slots.length - a.slots.length || a.day - b.day);

      // 3. Exhaustive Placement
      const usable = forceConsecutive ? runs.filter(r => r.slots.length >= 2) : runs;
      let bestEvents: Event[] = [];
      let bestCount = 0;

      const backtrack = (idx: number, current: Event[], count: number) => {
        if (count > bestCount) { bestCount = count; bestEvents = [...current]; }
        if (bestCount >= hoursNeeded || idx >= usable.length) return;

        let rem = 0;
        for (let i = idx; i < usable.length; i++) rem += Math.min(usable[i].slots.length, hoursNeeded - count);
        if (count + rem <= bestCount) return;

        for (let i = idx; i < usable.length; i++) {
          const r = usable[i];
          let take = Math.min(r.slots.length, hoursNeeded - count);
          if (forceConsecutive) {
            if (take === 1) { if (r.slots.length >= 2) take = 2; else continue; }
            if ((hoursNeeded - count) - take === 1) {
              if (r.slots.length > take) take += 1;
              else if (take - 1 >= 2) take -= 1;
              else continue;
            }
          }
          const batch: Event[] = [];
          for (let s = 0; s < take; s++) {
            batch.push({
              title: subject.subject, daysOfWeek: [r.day], startTime: timeSlots[r.slots[s].slotIdx][0], endTime: timeSlots[r.slots[s].slotIdx][1],
              extendedProps: { subjectId: subject.innerId, professorId: professorId || null, classroomId: r.slots[s].classroom.id, classroomName: r.slots[s].classroom.classroom, pnfId: subject.pnfId, trayectoId: subject.trayectoId, trayectoName: subject.trayectoName, seccion: subject.seccion, pnfName: subject.pnf, turnName: subject.turnoName, blockId: `${r.day} -${subject.innerId} ` }
            });
          }
          backtrack(i + 1, [...current, ...batch], count + take);
          if (bestCount >= hoursNeeded) return;
        }
      };
      backtrack(0, [], 0);
      return { events: bestEvents, count: bestCount };
    };

    // --- Strategy Orchestration ---
    let finalResult: { events: Event[]; count: number } = { events: [], count: 0 };
    let note = "";

    if (!ignoreRestrictions) {
      // Pass 1: Strict (Teacher + Subject Prefs)
      finalResult = executeSearch(profDays, prefClassrooms, preventSingleBlocksGlobal);

      // Pass 2: Relaxed Subject (Teacher + ALL Active Classrooms)
      // Only fallback if NOT exclusive
      if (finalResult.count < hoursNeeded && !subPref?.isExclusive) {
        const fallbackClassrooms = executeSearch(profDays, activeClassrooms, preventSingleBlocksGlobal);
        if (fallbackClassrooms.count > finalResult.count) {
          finalResult = fallbackClassrooms;
          note = "⚠️ Se ignoró la preferencia de aulas para encontrar espacio.";
        }
      }
    } else {
      // PASS 3: FORCE (ALL Days + Classrooms)
      // If exclusive, still restrict to pref classrooms. Else use all active rooms.
      const targetRooms = subPref?.isExclusive ? prefClassrooms : activeClassrooms;
      finalResult = executeSearch(defaultDays, targetRooms, preventSingleBlocksGlobal);

      if (subPref?.isExclusive) {
        note = "⚠️ Se ignoraron las restricciones de días del profesor. Se mantuvo la exclusividad de aulas.";
      } else {
        note = "⚠️ Se ignoraron las restricciones de días del profesor y aulas preferidas.";
      }
    }

    if (finalResult.count === 0) {
      message.error(!ignoreRestrictions ? "No se encontró espacio siguiendo las restricciones del profesor. Intente 'Forzar solución'." : "No hay espacio físico disponible para esta materia.");
      return;
    }

    const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    Modal.info({
      title: finalResult.count < hoursNeeded ? `Se asignaron ${finalResult.count} de ${hoursNeeded} horas` : `Horas asignadas con éxito`,
      content: (
        <div style={{ whiteSpace: "pre-line", marginTop: "8px", fontSize: "13px", lineHeight: "1.8" }}>
          {note && <div style={{ color: "#faad14", fontWeight: "bold", marginBottom: "8px" }}>{note}</div>}
          {finalResult.events.map(evt => `• ${dayNames[evt.daysOfWeek![0]]} ${evt.startTime} - ${evt.endTime} → ${evt.extendedProps.classroomName} `).join("\n")}
        </div>
      ),
      width: 480,
    });

    setLoadedScheduleEvents(prev => [...prev, ...finalResult.events]);
    setGenerationCounter(prev => prev + 1);
  }, [eventData, loadedScheduleEvents, classrooms, activeTurnos, trimestre, scheduleConfig, teacherRestrictions, subjectRestriction]);


  // Handler to change classroom for a specific event (specific day+time block)
  const handleChangeClassroom = () => {
    if (!classroomChangeEvent || !newClassroomId) return;
    const newClassroom = classrooms.find((c) => c.id === newClassroomId);
    if (!newClassroom || newClassroom.active == false) {
      message.error("El aula seleccionada está cerrada.");
      return;
    }

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

      // Registrar el override localmente
      const firstModified = modifiedEvents[0];
      if (firstModified) {
        const newOverride: ClassroomOverride = {
          subject_name: classroomChangeEvent.title,
          day: classroomChangeEvent.day,
          start_time: classroomChangeEvent.startTime,
          end_time: classroomChangeEvent.endTime,
          classroom_id: newClassroomId,
          seccion: firstModified.extendedProps?.seccion || null,
          pnf_id: firstModified.extendedProps?.pnfId || null,
          trayecto_id: firstModified.extendedProps?.trayectoId || null,
        };
        setClassroomOverrides((prev) => {
          // Reemplazar si ya existe un override para esta materia/día/hora
          const filtered = prev.filter(
            (o) => !(o.subject_name === newOverride.subject_name && o.day === newOverride.day && o.start_time === newOverride.start_time)
          );
          return [...filtered, newOverride];
        });
        setHasUnsavedOverrides(true);
      }

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
        content: `El aula "${newClassroom.classroom}" ya está ocupada por "${conflictingEvent.title}" el ${dayNames[classroomChangeEvent.day]} a las ${conflictingEvent.startTime}. ¿Deseas reasignar de todos modos y recalcular el horario alrededor de este cambio ? `,
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

  const putSubjectRestriction = async (subjectName: string, classroomIds: string[], pnfId?: string, isExclusive: boolean = false, splitHours: boolean = false, trayectoName: string = "") => {
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

    // Build compound key: subjectName_t_trayectoName
    const trayectoNorm = normalizeText(trayectoName);
    const compoundKey = `${normalizedName}_t_${trayectoNorm}`;

    const previousRestrictions = subjectRestriction;
    let updatedRestrictions: SubjectRestriction[] = JSON.parse(JSON.stringify(subjectRestriction));

    if (classroomIds.length === 0) {
      updatedRestrictions = updatedRestrictions.filter(
        (rest: SubjectRestriction) => !(rest.subjectKey === compoundKey && rest.pnfId === pnfId)
      );
    } else {
      const existing = updatedRestrictions.find(
        (rest) => rest.subjectKey === compoundKey && rest.pnfId === pnfId
      ) || updatedRestrictions.find(
        (rest) => rest.subjectKey === compoundKey && !rest.pnfId
      );
      if (existing) {
        existing.classroomIds = classroomIds;
        existing.subjectName = subjectName;
        existing.isExclusive = isExclusive;
        existing.splitHours = splitHours;
      } else {
        updatedRestrictions.push({ subjectKey: compoundKey, subjectName, classroomIds, pnfId, isExclusive, splitHours });
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
            defaultValue={`Horario ${new Date().toLocaleDateString()} `}
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
          message.error(`Error al guardar el horario: ${msg || "Error desconocido."} `);
          // Evita que el modal se cierre si la acción asíncrona falla
          return Promise.reject(new Error("Error de guardado"));
        } else {
          // Muestra un mensaje de éxito
          setActiveScheduleName(scheduleName);
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
    setActiveScheduleName("Horario fresco");
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
      setActiveScheduleName(_selectedSchedule.name);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const localErrors: scheduleError[] = [];
    const eventsdata = generateScheduleEvents({
      subjects: currentSubjects,
      classrooms: classrooms.filter(c => c.active !== false),
      trimestre: trimestre,
      preferredClassrooms: subjectRestriction,
      unavailableDays: teacherRestrictions,
      conserveSlots: scheduleConfig?.conserve_slots || consecutiveConfig.maxSlots,
      minConsecutiveSlots: scheduleConfig?.min_consecutive_slots || consecutiveConfig.minSlots,
      classroomOverrides: classroomOverrides,
      setErrors: (err) => localErrors.push(err),
      customDays: scheduleConfig?.days,
      customTurnos: activeTurnos,
      distributeEquitably: scheduleConfig?.distribute_equitably,
      preventSingleHourBlocks: scheduleConfig?.prevent_single_hour_blocks,
      breaks: scheduleConfig?.breaks,
      teachers: teachersRef.current || [],
      frozenEvents: Object.values(frozenSections).flat(),
      frozenSectionKeys: Object.keys(frozenSections),
    });

    if (scheduleConfig?.auto_solve && localErrors.length > 0) {
      let currentAllEvents = [...loadedScheduleEvents, ...eventsdata];
      const newlySolvedEvents: Event[] = [];
      let solvedCount = 0;
      let unresolvedErrors: scheduleError[] = [];

      for (const errorInfo of localErrors) {
        if (!errorInfo.subjectId) { unresolvedErrors.push(errorInfo); continue; }

        const subject = currentSubjects?.find(
          (s) => s.innerId === errorInfo.subjectId
        );
        if (!subject) { unresolvedErrors.push(errorInfo); continue; }

        const turnoName = subject.turnoName?.toLowerCase() || "";
        const timeSlots = activeTurnos[turnoName];
        if (!timeSlots || timeSlots.length === 0) { unresolvedErrors.push(errorInfo); continue; }

        const professorId = errorInfo.professorId || subject.quarter[trimestre] || null;
        const sectionKey = `${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`;
        const hoursNeeded = errorInfo.totalHours || subject.hours[trimestre] || 0;

        if (hoursNeeded <= 0) { unresolvedErrors.push(errorInfo); continue; }

        const preventSingleBlocksGlobal = !!scheduleConfig?.prevent_single_hour_blocks;
        const defaultDays = scheduleConfig?.days || [1, 2, 3, 4, 5];
        const activeClassrooms = classrooms.filter(c => c.active !== false);
        const profRestriction = teacherRestrictions.find(r => String(r.teacherId) === String(professorId));
        const profDays = profRestriction?.days ? defaultDays.filter(d => !new Set(profRestriction.days).has(d)) : defaultDays;

        const autoSubPrefKey = `${normalizeText(subject.subject)}_t_${normalizeText(subject.trayectoName || "")}`;
        const subPref = subjectRestriction.find(r => r.subjectKey === autoSubPrefKey);
        const prefClassrooms = (subPref?.classroomIds?.length || 0) > 0 ? activeClassrooms.filter(c => subPref!.classroomIds!.includes(c.id)) : activeClassrooms;

        const executeSearch = (days: number[], targetClassrooms: Classroom[], forceConsecutive: boolean) => {
          const occupancy = new Map<string, { professorIds: Set<string>; classroomIds: Set<string>; sectionKeys: Set<string>; }>();
          for (const evt of currentAllEvents) {
            if (!evt.daysOfWeek?.length || !evt.startTime) continue;
            const key = `${evt.daysOfWeek[0]}-${evt.startTime}`;
            if (!occupancy.has(key)) occupancy.set(key, { professorIds: new Set(), classroomIds: new Set(), sectionKeys: new Set(), });
            const occ = occupancy.get(key)!;
            if (evt.extendedProps?.professorId) occ.professorIds.add(String(evt.extendedProps.professorId));
            if (evt.extendedProps?.classroomId) occ.classroomIds.add(String(evt.extendedProps.classroomId));
            const sk = `${evt.extendedProps?.pnfId}-${evt.extendedProps?.trayectoId}-${evt.extendedProps?.seccion}`;
            occ.sectionKeys.add(sk);
          }

          const runs: { day: number; startSlotIdx: number; slots: { slotIdx: number; classroom: Classroom }[] }[] = [];
          for (const day of days) {
            for (const cr of targetClassrooms) {
              if (cr.active === false) continue;
              let currentRun: any = null;
              let lastEnd: string | null = null;
              for (let idx = 0; idx < timeSlots.length; idx++) {
                const [start, end] = timeSlots[idx];
                const occ = occupancy.get(`${day}-${start}`);
                const conflict = (professorId && occ?.professorIds.has(String(professorId))) ||
                  occ?.sectionKeys.has(sectionKey) ||
                  occ?.classroomIds.has(String(cr.id));
                const isAvailable = !conflict;
                let crossesBreak = false;
                if (lastEnd !== null && scheduleConfig?.breaks && scheduleConfig.breaks.length > 0) {
                  crossesBreak = scheduleConfig.breaks.some((b: any) => lastEnd! <= b.start && start >= b.end);
                }
                const isConsecutive = isAvailable && (lastEnd === null || !crossesBreak);
                if (isConsecutive) {
                  if (!currentRun) currentRun = { day, startSlotIdx: idx, slots: [] };
                  currentRun.slots.push({ slotIdx: idx, classroom: cr });
                  lastEnd = end;
                } else {
                  if (currentRun && currentRun.slots.length > 0) runs.push(currentRun);
                  if (isAvailable) { currentRun = { day, startSlotIdx: idx, slots: [{ slotIdx: idx, classroom: cr }] }; lastEnd = end; }
                  else { currentRun = null; lastEnd = null; }
                }
              }
              if (currentRun && currentRun.slots.length > 0) runs.push(currentRun);
            }
          }
          runs.sort((a, b) => b.slots.length - a.slots.length || a.day - b.day);

          const usable = forceConsecutive ? runs.filter(r => r.slots.length >= 2) : runs;
          let bestEvents: Event[] = [];
          let bestCount = 0;

          const backtrack = (idx: number, current: Event[], count: number) => {
            if (count > bestCount) { bestCount = count; bestEvents = [...current]; }
            if (bestCount >= hoursNeeded || idx >= usable.length) return;

            let rem = 0;
            for (let i = idx; i < usable.length; i++) rem += Math.min(usable[i].slots.length, hoursNeeded - count);
            if (count + rem <= bestCount) return;

            for (let i = idx; i < usable.length; i++) {
              const r = usable[i];

              // Calculate already placed hours for this subject on this day (from previous passes)
              let existingHoursOnDay = 0;
              for (const [start] of timeSlots) {
                if (occupancy.get(`${r.day}-${start}`)?.sectionKeys.has(sectionKey)) {
                  existingHoursOnDay++;
                }
              }

              // Calcular cuántas horas ya asignamos este día en la solución actual
              const currentHoursOnDay = current.filter(e => e.daysOfWeek.includes(r.day)).length;

              // El límite por día es normalmente conserveSlots, pero se permite más si el profesor tiene muy pocos días
              const maxAllowedToday = Math.max(
                scheduleConfig?.conserve_slots || consecutiveConfig.maxSlots,
                Math.ceil(hoursNeeded / Math.max(1, profDays.length))
              );

              const limit = maxAllowedToday - (currentHoursOnDay + existingHoursOnDay);
              if (limit <= 0) continue; // Ya se alcanzó el límite para este día

              let take = Math.min(r.slots.length, hoursNeeded - count, limit);

              if (forceConsecutive) {
                if (take === 1) { if (r.slots.length >= 2) take = 2; else continue; }
                if ((hoursNeeded - count) - take === 1) {
                  if (r.slots.length > take && limit > take) take += 1; // Needs limit > take to bump it up
                  else if (take - 1 >= 2) take -= 1;
                  else continue;
                }
              }
              const batch: Event[] = [];
              for (let s = 0; s < take; s++) {
                batch.push({
                  title: subject.subject, daysOfWeek: [r.day], startTime: timeSlots[r.slots[s].slotIdx][0], endTime: timeSlots[r.slots[s].slotIdx][1],
                  extendedProps: { subjectId: subject.innerId, professorId: professorId || null, classroomId: r.slots[s].classroom.id, classroomName: r.slots[s].classroom.classroom, pnfId: subject.pnfId, trayectoId: subject.trayectoId, trayectoName: subject.trayectoName, seccion: subject.seccion, pnfName: subject.pnf, turnName: subject.turnoName, blockId: `${r.day}-${subject.innerId}` }
                });
              }
              backtrack(i + 1, [...current, ...batch], count + take);
              if (bestCount >= hoursNeeded) return;
            }
          };
          backtrack(0, [], 0);
          return { events: bestEvents, count: bestCount };
        };

        let finalResult = executeSearch(profDays, prefClassrooms, preventSingleBlocksGlobal);

        if (finalResult.count < hoursNeeded && !subPref?.isExclusive) {
          const fallbackClassrooms = executeSearch(profDays, activeClassrooms, preventSingleBlocksGlobal);
          if (fallbackClassrooms.count > finalResult.count) {
            finalResult = fallbackClassrooms;
          }
        }

        if (finalResult.count === 0) {
          unresolvedErrors.push(errorInfo);
        } else {
          if (finalResult.count < hoursNeeded) {
            unresolvedErrors.push({ ...errorInfo, totalHours: hoursNeeded - finalResult.count, description: `Se asignaron parcialmente ${finalResult.count} horas. Faltan ${hoursNeeded - finalResult.count} horas. ${errorInfo.description}` });
          } else {
            solvedCount++;
          }
          newlySolvedEvents.push(...finalResult.events);
          currentAllEvents.push(...finalResult.events);
        }
      }

      eventsdata.push(...newlySolvedEvents);
      setErrors(unresolvedErrors);

      setTimeout(() => {
        if (solvedCount > 0 || newlySolvedEvents.length > 0) {
          if (unresolvedErrors.length > 0) {
            message.warning(`Auto-solución: Se solucionaron algunos problemas, pero todavía quedan ${unresolvedErrors.length} conflictos.`);
          }
        }
      }, 300);

    } else {
      setErrors(localErrors);
    }

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
      // 1. Identificar qué profesores pertenecen al PNF seleccionado
      const targetTeacherIds = new Set(
        (teachers || [])
          .filter((t: any) => !profPnf || t.PNF === profPnf)
          .map((t: any) => String(t.id))
      );

      // 2. Mostrar TODAS las materias de esos profesores (sin importar el PNF de la materia)
      filteredLoaded = loadedScheduleEvents.filter(
        (event) => !!event.extendedProps.professorId && targetTeacherIds.has(String(event.extendedProps.professorId))
      );
      filteredGenerated = eventData.filter(
        (event) => !!event.extendedProps.professorId && targetTeacherIds.has(String(event.extendedProps.professorId))
      );
    } else if (viewMode === "classroom") {
      // Mostrar todas las materias asignadas a algún aula
      filteredLoaded = loadedScheduleEvents.filter((event) => !!event.extendedProps?.classroomId);
      filteredGenerated = eventData.filter((event) => !!event.extendedProps?.classroomId);
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
    profPnf,
    teachers,
    trayectoId,
    viewMode,
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
      // No necesitamos un profesor por defecto para la vista de profesor general

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
    selectedClassroomId,
  ]);

  // --- TABLE DATA PREPARATION ---
  const { tableSlots, tableGrid, professorGrids, classroomGrids } = useMemo(() => {
    let slots: string[][] = [];

    // Logic from PrintableSchedule for slots
    if (viewMode === "professor" || viewMode === "classroom") {
      const allSlots = new Set<string>();
      if (activeTurnos) {
        Object.values(activeTurnos).forEach((turnSlots) => {
          if (Array.isArray(turnSlots)) {
            turnSlots.forEach((slot) => allSlots.add(JSON.stringify(slot)));
          }
        });
      }
      slots = Array.from(allSlots)
        .map((s) => JSON.parse(s) as [string, string])
        .sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      slots = activeTurnos?.[turn] || [];
    }

    const buildGrid = (targetSlots: string[][], targetEvents: any[]) => {
      const g = Array(targetSlots.length).fill(null).map(() => Array(8).fill(null));
      const sortedEvents = [...targetEvents].sort((a: any, b: any) =>
        a.startTime.localeCompare(b.startTime)
      );

      sortedEvents.forEach((event: any) => {
        if (!event.daysOfWeek || !event.daysOfWeek.length) return;
        const day = event.daysOfWeek[0];
        if (day < 1 || day > 7) return;

        const slotIndex = targetSlots.findIndex((s) => s[0] === event.startTime);
        if (slotIndex === -1) return;

        let span = 1;
        for (let i = slotIndex; i < targetSlots.length; i++) {
          if (targetSlots[i][1] === event.endTime) {
            span = i - slotIndex + 1;
            break;
          }
        }

        const prevSlotIndex = slotIndex - 1;
        let merged = false;

        if (prevSlotIndex >= 0) {
          let headIndex = prevSlotIndex;
          while (headIndex >= 0 && g[headIndex][day]?.occupied) {
            headIndex--;
          }
          if (headIndex >= 0 && g[headIndex][day] && !g[headIndex][day].occupied) {
            const prevEvent = g[headIndex][day];
            if (headIndex + prevEvent.rowSpan === slotIndex) {
              const sameTitle = prevEvent.title === event.title;
              const sameProf = prevEvent.extendedProps?.professorId === event.extendedProps?.professorId;
              const sameClassroom = prevEvent.extendedProps?.classroomId === event.extendedProps?.classroomId;
              const sameSection = prevEvent.extendedProps?.seccion === event.extendedProps?.seccion;

              if (sameTitle && sameProf && sameClassroom && sameSection) {
                prevEvent.rowSpan += span;
                merged = true;
                for (let k = 0; k < span; k++) {
                  if (g[slotIndex + k]) g[slotIndex + k][day] = { occupied: true };
                }
              }
            }
          }
        }
        if (!merged) {
          if (!g[slotIndex][day]) {
            g[slotIndex][day] = { ...event, rowSpan: span };
            for (let k = 1; k < span; k++) {
              if (g[slotIndex + k]) g[slotIndex + k][day] = { occupied: true };
            }
          }
        }
      });
      return g;
    };

    let pGrids: { profId: string; profName: string; grid: any[][] }[] | null = null;
    let cGrids: { classroomId: string; classroomName: string; grid: any[][] }[] | null = null;
    let mainGrid: any[][] = [];

    if (viewMode === "professor") {
      const profIds = Array.from(new Set((events || []).map((e) => e.extendedProps?.professorId).filter(Boolean)));
      pGrids = profIds.map((pid) => {
        const profEvents = (events || []).filter((e) => e.extendedProps?.professorId === pid);
        const t = teachers?.find((t: any) => String(t.id) === String(pid));
        const profName = t ? `${t.name} ${t.lastName}` : `Profesor (ID: ${pid})`;
        return {
          profId: String(pid),
          profName,
          grid: buildGrid(slots, profEvents),
        };
      }).sort((a, b) => a.profName.localeCompare(b.profName));
    } else if (viewMode === "classroom") {
      const crIds = Array.from(new Set((events || []).map((e) => e.extendedProps?.classroomId).filter(Boolean)));
      cGrids = crIds.map((cid: string) => {
        const crEvents = (events || []).filter((e) => e.extendedProps?.classroomId === cid);
        const c = classrooms?.find((c: any) => String(c.id) === String(cid));
        const classroomName = c ? c.classroom : `Aula (ID: ${cid})`;
        return {
          classroomId: cid,
          classroomName,
          grid: buildGrid(slots, crEvents),
        };
      }).sort((a, b) => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        return collator.compare(a.classroomName, b.classroomName);
      });
    } else {
      mainGrid = buildGrid(slots, events || []);
    }

    return { tableSlots: slots, tableGrid: mainGrid, professorGrids: pGrids, classroomGrids: cGrids };
  }, [viewMode, activeTurnos, turn, events, teachers, classrooms]);

  // Effect to automatically scroll to professor or classroom
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (viewMode === "professor") {
      // Check if the selected professor still exists in the current target set after filters (like profPnf)
      if (scrollToProfessorId && teachers) {
        const t = teachers.find((teacher: any) => String(teacher.id) === String(scrollToProfessorId));
        // If a specific PNF is selected, clear if the selected professor doesn't belong to it
        if (profPnf && t && t.PNF !== profPnf) {
          setScrollToProfessorId(null);
          localStorage.removeItem("schedule_scrollToProfessorId");
          setIsScrollingToProf(false);
          hasScrolledRef.current = true;
          return;
        }
      }

      if (scrollToProfessorId && !hasScrolledRef.current && professorGrids && professorGrids.length > 0) {
        setIsScrollingToProf(true);
        // Función de reintento para dar margen a que el DOM se dibuje
        const tryScroll = (attempts = 0) => {
          const el = document.getElementById(`prof-grid-${scrollToProfessorId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
            hasScrolledRef.current = true;
            setIsScrollingToProf(false);
          } else if (attempts < 10) {
            timer = setTimeout(() => tryScroll(attempts + 1), 50);
          } else {
            // Si después de varios intentos no lo encuentra, aborta para no dejar el spinner infinito
            hasScrolledRef.current = true;
            setIsScrollingToProf(false);
          }
        };
        timer = setTimeout(() => tryScroll(0), 50);
      } else if (!scrollToProfessorId) {
        setIsScrollingToProf(false);
      }
    } else if (viewMode === "classroom") {
      if (selectedClassroomId && !hasScrolledRef.current && classroomGrids && classroomGrids.length > 0) {
        setIsScrollingToClassroom(true);
        const tryScroll = (attempts = 0) => {
          const el = document.getElementById(`classroom-grid-${selectedClassroomId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
            hasScrolledRef.current = true;
            setIsScrollingToClassroom(false);
          } else if (attempts < 10) {
            timer = setTimeout(() => tryScroll(attempts + 1), 50);
          } else {
            hasScrolledRef.current = true;
            setIsScrollingToClassroom(false);
          }
        };
        timer = setTimeout(() => tryScroll(0), 50);
      } else if (!selectedClassroomId) {
        setIsScrollingToClassroom(false);
      }
    } else {
      setIsScrollingToProf(false);
      setIsScrollingToClassroom(false);
    }
    return () => clearTimeout(timer);
  }, [viewMode, scrollToProfessorId, professorGrids, selectedClassroomId, classroomGrids]);

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

    const sourceSlots = tableSlots.slice(sourceStartIdx, sourceStartIdx + rowSpan);
    const sourceSlotStarts = sourceSlots.map(s => s[0]);

    const pinDraggedEventsAndRecalculate = () => {
      const targetOverrides: ClassroomOverride[] = [{
        subject_name: title,
        day: targetDay,
        start_time: targetSlots[0][0],
        end_time: targetSlots[targetSlots.length - 1][1],
        classroom_id: classroomId,
        seccion: firstMovingEvent.extendedProps?.seccion || null,
        pnf_id: firstMovingEvent.extendedProps?.pnfId || null,
        trayecto_id: firstMovingEvent.extendedProps?.trayectoId || null,
      }];

      setClassroomOverrides(prev => {
        // Remover cualquier versión previa en la posición de origen (source) o destino (target)
        const filtered = prev.filter(o => {
          const isFromSource = o.subject_name === title &&
            o.day === sourceDay &&
            sourceSlotStarts.includes(o.start_time);

          const isAtTarget = o.subject_name === title &&
            o.day === targetDay &&
            targetSlotStarts.includes(o.start_time);

          return !isFromSource && !isAtTarget;
        });

        return [...filtered, ...targetOverrides];
      });
      setHasUnsavedOverrides(true);
      setGenerationCounter(prev => prev + 1);
    };

    if (conflictFound) {
      Modal.confirm({
        title: "Conflicto de Horario Detectado",
        content: `La posición que deseas asignar tiene conflictos o restricciones ocupadas. ¿Deseas forzar el cambio de todos modos y recalcular automáticamente el resto del horario alrededor de esta nueva posición ? `,
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
    if (mode === "professor" && scrollToProfessorId) {
      hasScrolledRef.current = false;
      setIsScrollingToProf(true);
    }
  };

  return (
    <>
      <div className="schedule-select-main-container">
        <div className="schedule-select-container">
          <div className="header-row-top">
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

            <div className="schedule-status-indicator">
              <div className={`dot ${activeScheduleName === "Horario fresco" ? "fresh" : "loaded"}`} />
              <span className="status-text">{activeScheduleName === "Horario fresco" ? "Nuevo" : "Cargado"}</span>
              <span className="schedule-name">{activeScheduleName}</span>
            </div>
          </div>

          <div className="header-row-bottom">
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
                  <span>PNF:</span>
                  <Select
                    size="small"
                    allowClear
                    placeholder="Todos los PNF"
                    value={profPnf || undefined}
                    style={{ width: 250 }}
                    onChange={(val) => {
                      setProfPnf(val || "");
                      // Limpiar profesor seleccionado y hacer scroll al top
                      setScrollToProfessorId(null);
                      localStorage.removeItem("schedule_scrollToProfessorId");
                      hasScrolledRef.current = true;
                      setIsScrollingToProf(false);
                      setErrors([]);
                      setTimeout(() => {
                        const scrollContainer = document.getElementById('professor-scroll-container');
                        if (scrollContainer) {
                          scrollContainer.scrollTop = 0;
                        }
                      }, 50);
                    }}
                    options={Array.from(
                      new Set(
                        (teachers || [])
                          .map((t: any) => t.PNF)
                          .filter(Boolean)
                      )
                    )
                      .sort()
                      .map((pnfVal) => {
                        const match = (subjects || []).find(s => s.pnfId === pnfVal && s.pnf !== "ADMIN");
                        return {
                          value: pnfVal,
                          label: match ? match.pnf : pnfVal,
                        };
                      })}
                  />
                </div>
                <div className="schedule-select">
                  <span>Ir a Profesor:</span>
                  <Select
                    allowClear
                    size="small"
                    showSearch
                    placeholder="Buscar profesor..."
                    value={scrollToProfessorId}
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: 350 }}
                    onChange={(val) => {
                      setScrollToProfessorId(val || null);
                      if (val) {
                        hasScrolledRef.current = false;
                        setIsScrollingToProf(true);
                        localStorage.setItem("schedule_scrollToProfessorId", val);
                      } else {
                        localStorage.removeItem("schedule_scrollToProfessorId");
                        const scrollContainer = document.getElementById('professor-scroll-container');
                        if (scrollContainer) {
                          scrollContainer.scrollTop = 0;
                        }
                      }
                    }}
                    options={(() => {
                      // Usar professorGrids como fuente principal (ya filtrado por materias)
                      let baseOptions = professorGrids?.map(pg => ({ value: pg.profId, label: pg.profName })) || [];

                      // Si no hay grids (cargando o filtrado), pero hay profesores que coinciden con el profPnf,
                      // los mostramos como fallback para que el select no se vea con puros UUIDs
                      if (baseOptions.length === 0 && teachers) {
                        baseOptions = teachers
                          .filter((t: any) => !profPnf || t.PNF === profPnf)
                          .map((t: any) => ({ value: String(t.id), label: `${t.name} ${t.lastName}` }));
                      }

                      // Asegurar que el seleccionado actualmente siempre tenga su label (evita flash de UUID)
                      if (scrollToProfessorId && !baseOptions.some(o => o.value === scrollToProfessorId) && teachers) {
                        const t = teachers.find(t => String(t.id) === String(scrollToProfessorId));
                        if (t) {
                          baseOptions.push({ value: scrollToProfessorId, label: `${t.name} ${t.lastName}` });
                        }
                      }
                      return baseOptions.sort((a, b) => a.label.localeCompare(b.label));
                    })()}
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
                  <span>Ir a Aula:</span>
                  <Select
                    allowClear
                    size="small"
                    showSearch
                    value={selectedClassroomId}
                    placeholder="Buscar aula..."
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: 250 }}
                    onChange={(val) => {
                      setSelectedClassroomId(val || null);
                      if (val) {
                        hasScrolledRef.current = false;
                        setIsScrollingToClassroom(true);
                      } else {
                        const scrollContainer = document.getElementById('professor-scroll-container');
                        if (scrollContainer) {
                          scrollContainer.scrollTop = 0;
                        }
                      }
                    }}
                    options={(classrooms || [])
                      .slice()
                      .sort((a, b) =>
                        a.classroom.localeCompare(b.classroom, undefined, { numeric: true, sensitivity: "base" })
                      )
                      .map((classroom) => ({
                        value: classroom.id,
                        label: classroom.classroom,
                        disabled: !classroom.active
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <FaPrint
                  title={viewMode === "pnf" ? "Imprimir Horario" : "Imprimir Todos los Horarios"}
                  className={styles.icon}
                  onClick={() => { setPrintEntityId(null); setTimeout(() => handlePrint(), 100); }}
                />
                {/* <FaFilePdf
                  title={viewMode === "pnf" ? "Descargar PDF del Horario" : "Descargar PDF de Todos los Horarios"}
                  className={styles.icon}
                  style={{ color: "#d32f2f" }}
                  onClick={() => { setPrintEntityId(null); setTimeout(() => handleDownloadPdf(), 100); }}
                /> */}
              </div>
              <Tooltip title={hasUnsavedOverrides ? "Guardar cambios de aula (sin guardar)" : "Guardar cambios de aula"}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <BsPinAngleFill
                    title="Guardar Cambios de Aula"
                    className={styles.icon}
                    onClick={handleSaveOverrides}
                    style={{ color: hasUnsavedOverrides ? "#ff4d4f" : undefined }}
                  />
                  {hasUnsavedOverrides && (
                    <span style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#ff4d4f",
                    }} />
                  )}
                </span>
              </Tooltip>
              <Tooltip title={`Ver cambios de aula fijados (${groupedOverridesCount})`}>
                <span
                  onClick={() => setIsOverridesModalOpen(true)}
                  style={{ cursor: "pointer", position: "relative", display: "inline-flex", alignItems: "center" }}
                >
                  <FaBuildingLock className={styles.icon} />
                  {groupedOverridesCount > 0 && (
                    <span style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-8px",
                      background: "#1890ff",
                      color: "#fff",
                      borderRadius: "50%",
                      fontSize: "0.6rem",
                      width: "14px",
                      height: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}>
                      {groupedOverridesCount}
                    </span>
                  )}
                </span>
              </Tooltip>
              <Tooltip title="Gestionar Secciones Congeladas">
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }} onClick={() => setIsFrozenManagerOpen(true)}>
                  <GiFrozenBlock className={styles.icon} style={{ color: Object.keys(frozenSections).length > 0 ? "#1890ff" : undefined }} />
                  {Object.keys(frozenSections).length > 0 && (
                    <Badge count={Object.keys(frozenSections).length} style={{ backgroundColor: "#1890ff", position: "absolute", top: "-5px", right: "-8px", transform: "scale(0.8)" }} />
                  )}
                </span>
              </Tooltip>
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
                subjectRestrictions={subjectRestriction}
                loadingSubjectRestrictions={!subjectRestrictionsReady}
              />
              <TeachersRestrictionsListModal
                restrictions={teacherRestrictions}
                onEditTeacher={(teacherId) => setEditingTeacherId(teacherId)}
              />
              <ClassroomManagerModal classrooms={classrooms} onClassroomsUpdated={loadClassrooms} />

              <ScheduleErrorsModal errors={errors} onForceInsert={handleForceInsert} />
              <FaCog title="Configuración" className={styles.icon} onClick={() => setIsConfigModalOpen(true)} />
              <ScheduleConfigModal
                visible={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onConfigUpdate={(newConfig) => setScheduleConfig(newConfig)}
              />
            </div>
          </div>
        </div>

        <div className="schedule-content-wrapper" style={{ position: "relative" }}>
          {isScrollingToProf && (
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 1)",
              zIndex: 1000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column"
            }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: "#1890ff", fontWeight: "bold", fontSize: "1.2rem" }}>Ubicando profesor...</div>
            </div>
          )}
          {isScrollingToClassroom && (
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 1)",
              zIndex: 1000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column"
            }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: "#1890ff", fontWeight: "bold", fontSize: "1.2rem" }}>Ubicando aula...</div>
            </div>
          )}
          <div id="professor-scroll-container" className={`calendar - container view - ${viewMode} `} style={{ padding: "0", overflowY: "auto" }}>
            {tableSlots.length > 0 ? (
              (() => {
                const renderScheduleGrid = (gridToRender: any[][], title?: string, id?: string, entityId?: string) => (
                  <div key={title || "main-grid"} id={id} style={{ marginBottom: title ? "50px" : "0" }}>
                    {title && (
                      <h3 style={{
                        margin: "0 0 16px 0",
                        padding: "8px 16px",
                        backgroundColor: "#f0f5ff",
                        color: "#0050b3",
                        borderLeft: "5px solid #1890ff",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>{title}</span>
                        {entityId && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Tooltip title={`Imprimir horario de ${title}`}>
                              <div
                                onClick={() => triggerPrint(entityId)}
                                style={{
                                  cursor: "pointer",
                                  color: "#666",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  transition: "background-color 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <FaPrint size={18} />
                              </div>
                            </Tooltip>
                            {/* <Tooltip title={`Descargar PDF de ${title}`}>
                              <div
                                onClick={() => triggerDownload(entityId)}
                                style={{
                                  cursor: "pointer",
                                  color: "#d32f2f",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  transition: "background-color 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(211,47,47,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {isGeneratingPdf && printEntityId === entityId ? <Spin size="small" /> : <FaFilePdf size={18} />}
                              </div>
                            </Tooltip> */}
                          </div>
                        )}
                      </h3>
                    )}
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.85rem",
                      tableLayout: "fixed",
                      boxShadow: frozenSections[`${pnf}-${trayectoId}-${seccion}`] && !title ? "0 0 15px rgba(0, 191, 255, 0.4)" : "none",
                      border: frozenSections[`${pnf}-${trayectoId}-${seccion}`] && !title ? "3px solid rgba(0, 191, 255, 0.6)" : "1px solid #dee2e6",
                      transition: "all 0.3s ease"
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
                          const formatTime = (t: string) => t;

                          return (
                            <tr key={rowIndex} style={{ height: "1px" }}>
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
                                const cell = gridToRender[rowIndex][day];
                                if (cell?.occupied) return null;

                                if (cell) {
                                  const pnfId = cell.extendedProps?.pnfId;
                                  const baseColor = (pnfId && subjectColors?.[pnfId]) || "#1a73e8";
                                  const bgColor = hexToRgba(baseColor, 0.12);
                                  const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                                  const endTimeIndex = rowIndex + cell.rowSpan - 1;
                                  const endTime = tableSlots[endTimeIndex] ? tableSlots[endTimeIndex][1] : "";

                                  const isFrozen = !!frozenSections[`${cell.extendedProps?.pnfId}-${cell.extendedProps?.trayectoId}-${cell.extendedProps?.seccion}`];

                                  const tooltipContent = (
                                    <div style={{ textAlign: "center" }}>
                                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{cell.title}</div>
                                      <div>{`${tableSlots[rowIndex][0]} - ${endTime}`}</div>
                                      <div>{dayNames[day]}</div>
                                      {isFrozen && (
                                        <div style={{ marginTop: "6px", color: "#69c0ff", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                          <LockOutlined /> Sección Congelada
                                        </div>
                                      )}
                                    </div>
                                  );

                                  const contextMenuItems = [
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
                                      draggable={!isFrozen}
                                      onDragStart={(e) => {
                                        if (isFrozen) {
                                          e.preventDefault();
                                          return;
                                        }
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
                                      onDragEnd={() => setDraggedEventInfo(null)}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = isFrozen ? "none" : "move";
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (isFrozen) {
                                          message.warning("La sección de esta materia está congelada.");
                                          return;
                                        }
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
                                            <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#212529", lineHeight: "1.2", marginBottom: "4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                              <span>{cell.title}</span>
                                              {overrideKeys.has(`${cell.title}|${day}|${slot[0]}`) && (
                                                <TbPinFilled style={{ color: "#1890ff", fontSize: "0.8rem", flexShrink: 0, marginLeft: "2px", marginTop: "1px" }} title="Aula fijada manualmente" />
                                              )}
                                            </div>

                                            <div style={{ display: "flex", flexDirection: "column", flexWrap: "wrap", gap: "4px", marginBottom: "4px" }}>
                                              {cell.extendedProps?.classroomName && viewMode !== "classroom" && (
                                                <div style={{ fontSize: "0.65rem", padding: "1px 5px", color: "#333" }}>
                                                  {cell.extendedProps.classroomName}
                                                </div>
                                              )}

                                              {(viewMode === "professor" || viewMode === "classroom") && (
                                                <div style={{ fontSize: "0.65rem", padding: "1px 5px", color: "#333", display: "flex", flexDirection: "column" }}>
                                                  <span>{cell.extendedProps?.pnfName}</span>
                                                  <span>
                                                    <span style={{ fontWeight: "600" }}>Sec:</span> {cell.extendedProps?.seccion}
                                                    {cell.extendedProps?.trayectoName && (
                                                      <> | <span style={{ fontWeight: "600" }}>{cell.extendedProps.trayectoName}</span></>
                                                    )}
                                                  </span>
                                                </div>
                                              )}

                                              {viewMode !== "professor" && (
                                                (() => {
                                                  const profId = cell.extendedProps?.professorId;
                                                  if (!profId) return <div style={{ fontSize: "0.75rem", color: "#999" }}>Sin Profesor Asignado</div>;
                                                  const prof = teachers?.find((t: any) => t.id === profId);
                                                  if (!prof) return <div style={{ fontSize: "0.75rem", color: "#999" }}>Sin Profesor Asignado</div>;
                                                  const fullName = `${prof.name || ""} ${prof.lastName || ""}`.trim();
                                                  const academicTitle = prof.title || "Profesor";
                                                  return (
                                                    <div style={{ fontSize: "0.75rem", color: "#495057" }}>
                                                      {prof.is_placeholder ? (
                                                        <span style={{ fontStyle: "italic", color: "#666" }}>{fullName} (Propuesta)</span>
                                                      ) : (
                                                        <><span style={{ fontWeight: "600" }}>{academicTitle}:</span> {fullName}</>
                                                      )}
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
                                  const isGridFrozen = viewMode === "pnf" && !!frozenSections[`${pnf}-${trayectoId}-${seccion}`];
                                  return (
                                    <td key={day} style={{ border: "1px solid #dee2e6" }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = isGridFrozen ? "none" : "move";
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (isGridFrozen) {
                                          message.warning("Esta sección está congelada.");
                                          return;
                                        }
                                        handleDrop(rowIndex, day);
                                      }}
                                    ></td>
                                  );
                                }
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );

                if (viewMode === "professor") {
                  return professorGrids && professorGrids.length > 0
                    ? professorGrids.map((pg) => renderScheduleGrid(pg.grid, pg.profName, `prof-grid-${pg.profId}`, pg.profId))
                    : <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Ningún profesor tiene materias asignadas este trimestre.</div>;
                }

                if (viewMode === "classroom") {
                  return classroomGrids && classroomGrids.length > 0
                    ? classroomGrids.map((cg) => renderScheduleGrid(cg.grid, cg.classroomName, `classroom-grid-${cg.classroomId}`, cg.classroomId))
                    : <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Ningún aula tiene materias asignadas este trimestre.</div>;
                }

                if (viewMode === "pnf") {
                  const currentSectionKey = `${pnf}-${trayectoId}-${seccion}`;
                  const isFrozen = !!frozenSections[currentSectionKey];
                  return (
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", marginTop: "10px", paddingRight: "10px" }}>
                        <Button
                          type={isFrozen ? "primary" : "default"}
                          danger={isFrozen}
                          icon={isFrozen ? <UnlockOutlined /> : <LockOutlined />}
                          onClick={() => toggleFreezeSection(pnf, trayectoId, seccion)}
                          style={{ boxShadow: isFrozen ? "0 0 8px rgba(255, 77, 79, 0.4)" : "0 0 8px rgba(0, 191, 255, 0.4)", borderColor: isFrozen ? "#ff4d4f" : "#1890ff", color: isFrozen ? "#fff" : "#1890ff" }}
                        >
                          {isFrozen ? "Descongelar Sección" : "Congelar Sección"}
                        </Button>
                      </div>
                      {renderScheduleGrid(tableGrid)}
                    </div>
                  );
                }

                return renderScheduleGrid(tableGrid);
              })()
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                No hay horarios configurados para este turno
              </div>
            )}
          </div>

          {/* Hidden Printable Schedule */}
          <div
            style={{ display: "block", position: "absolute", left: "-10000px", top: 0, width: "auto", height: "auto", overflow: "visible", zIndex: -1000 }}>
            <div ref={printableRef}>
              <PrintableSchedule
                events={printEntityId
                  ? events.filter(e => viewMode === "professor"
                    ? String(e.extendedProps?.professorId) === String(printEntityId)
                    : String(e.extendedProps?.classroomId) === String(printEntityId)
                  )
                  : events}
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
                optionFilterProp="title"
                options={classrooms.map(c => {
                  let isOccupied = false;
                  if (classroomChangeEvent) {
                    const allEventsForConflict = [...loadedScheduleEvents, ...(eventData || [])];
                    isOccupied = allEventsForConflict.some((evt) => {
                      const sameDay = evt.daysOfWeek?.includes(classroomChangeEvent.day);
                      const usesTargetClassroom = evt.extendedProps?.classroomId === c.id;
                      const overlapsTime =
                        evt.startTime >= classroomChangeEvent.startTime &&
                        evt.startTime < classroomChangeEvent.endTime;
                      const isOtherEvent =
                        evt.title !== classroomChangeEvent.title ||
                        evt.extendedProps?.classroomId !== classroomChangeEvent.currentClassroomId;

                      return sameDay && usesTargetClassroom && overlapsTime && isOtherEvent;
                    });
                  }

                  return {
                    value: c.id,
                    title: c.classroom,
                    label: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{c.classroom}</span>
                        {isOccupied ? (
                          <span style={{ fontSize: '10px', color: '#ff4d4f', background: '#fff2f0', padding: '0px 6px', borderRadius: '4px', border: '1px solid #ffccc7', lineHeight: '1.4', display: 'inline-block' }}>Ocupada</span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#52c41a', background: '#f6ffed', padding: '0px 6px', borderRadius: '4px', border: '1px solid #b7eb8f', lineHeight: '1.4', display: 'inline-block' }}>Libre</span>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            </div>
          </div>
        )}
      </Modal>

      <ClassroomOverridesModal
        open={isOverridesModalOpen}
        onClose={() => setIsOverridesModalOpen(false)}
        overrides={classroomOverrides}
        classrooms={classrooms}
        onDelete={handleDeleteOverrides}
        onDeleteAll={handleDeleteAllOverrides}
      />

      {/* Frozen Sections Manager Modal */}
      <Modal
        title={<div><LockOutlined style={{ color: "#1890ff", marginRight: "8px" }} /> Gestionar Secciones Congeladas</div>}
        open={isFrozenManagerOpen}
        onCancel={() => setIsFrozenManagerOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsFrozenManagerOpen(false)}>Cerrar</Button>
        ]}
        width={700}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "10px" }}>
          {Array.from(new Set(subjects?.map(s => s.pnfId).filter(Boolean))).map(pnfId => {
            const pnfName = subjects?.find(s => s.pnfId === pnfId)?.pnf || pnfId;
            const allTrayectosRaw = Array.from(new Set(subjects?.filter(s => s.pnfId === pnfId).map(s => s.trayectoId).filter(Boolean)));
            const trayectosInPnf = allTrayectosRaw.sort((a, b) => {
              const nameA = trayectosList?.find(t => t.id === a)?.name || a;
              const nameB = trayectosList?.find(t => t.id === b)?.name || b;
              return nameA.localeCompare(nameB);
            });
            if (!trayectosInPnf.length) return null;

            const allPnfSections = trayectosInPnf.flatMap(trayId => {
              return Array.from(new Set(subjects?.filter(s => s.pnfId === pnfId && s.trayectoId === trayId).map(s => s.seccion).filter(Boolean)))
                .map(sec => ({ trayId, sec }));
            });
            const frozenInPnfCount = allPnfSections.filter(({ trayId, sec }) => !!frozenSections[`${pnfId}-${trayId}-${sec}`]).length;
            const isPnfAllFrozen = frozenInPnfCount === allPnfSections.length && allPnfSections.length > 0;
            const isPnfIndeterminate = frozenInPnfCount > 0 && frozenInPnfCount < allPnfSections.length;

            return (
              <div key={pnfId} style={{ marginBottom: "20px", border: "1px solid #f0f0f0", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#fafafa", padding: "10px 15px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold" }}>{pnfName}</span>
                  <Checkbox
                    indeterminate={isPnfIndeterminate}
                    checked={isPnfAllFrozen}
                    onChange={() => toggleFreezePnf(pnfId as string, pnfName as string, allPnfSections as { trayId: string, sec: string }[], isPnfAllFrozen)}
                  >
                    Congelar PNF Completo
                  </Checkbox>
                </div>
                <div style={{ padding: "10px" }}>
                  {trayectosInPnf.map(trayId => {
                    const trayName = trayectosList?.find(t => t.id === trayId)?.name || trayId;
                    const sectionsInTray = Array.from(new Set(subjects?.filter(s => s.pnfId === pnfId && s.trayectoId === trayId).map(s => s.seccion).filter(Boolean))).sort(new Intl.Collator('es', { numeric: true }).compare);
                    if (!sectionsInTray.length) return null;

                    const frozenInTrayCount = sectionsInTray.filter(sec => !!frozenSections[`${pnfId}-${trayId}-${sec}`]).length;
                    const isTrayAllFrozen = frozenInTrayCount === sectionsInTray.length && sectionsInTray.length > 0;
                    const isTrayIndeterminate = frozenInTrayCount > 0 && frozenInTrayCount < sectionsInTray.length;

                    return (
                      <div key={trayId} style={{ marginBottom: "15px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ fontSize: "0.9rem", color: "#666" }}>{trayName}</div>
                          <Checkbox
                            indeterminate={isTrayIndeterminate}
                            checked={isTrayAllFrozen}
                            onChange={() => toggleFreezeTrayecto(pnfId as string, trayId as string, trayName as string, sectionsInTray as string[], isTrayAllFrozen)}
                          >
                            Congelar Trayecto
                          </Checkbox>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                          {sectionsInTray.map(sec => {
                            const isFrozen = !!frozenSections[`${pnfId}-${trayId}-${sec}`];
                            return (
                              <div
                                key={sec}
                                style={{
                                  border: isFrozen ? "1px solid #1890ff" : "1px solid #d9d9d9",
                                  backgroundColor: isFrozen ? "#e6f7ff" : "#fff",
                                  padding: "5px 12px",
                                  borderRadius: "16px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  transition: "all 0.2s"
                                }}
                                onClick={() => toggleFreezeSection(pnfId as string, trayId as string, sec as string)}
                              >
                                {isFrozen ? <LockOutlined style={{ color: "#1890ff" }} /> : <UnlockOutlined style={{ color: "#999" }} />}
                                <span style={{ fontWeight: isFrozen ? "bold" : "normal", color: isFrozen ? "#1890ff" : "inherit" }}>
                                  Sección {sec}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
};

export default SchoolSchedule;
