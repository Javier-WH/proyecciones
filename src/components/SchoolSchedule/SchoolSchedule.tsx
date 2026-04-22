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
import { Select, Modal, message, List, Tooltip, Dropdown, Spin, Button, Badge, Checkbox, Radio } from "antd";
import { SwapOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { generateScheduleEvents, mergeConsecutiveEvents, turnos, Classroom, Event } from "./fucntions";
import TeacherRestrictionModal from "./TeacherRestrictionModal";
import { LockedSectionsStageManager } from "./LockedSectionsStageManager";
import StagingArea from "./StagingArea";
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
import { upsertLockedSection } from "../../fetch/schedule/lockedSectionsFetch";
import useSetSubject from "../../hooks/useSetSubject";


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
  days?: number[];
  restricted_days?: number[];
  day?: number;
  restricted_hours?: { day: number; start: string; end: string }[];
  hours?: { day: number; start: string; end: string }[];
};

type PendingLockedSectionSave = {
  key: string;
  pnfId: string;
  trayectoId: string;
  seccion: string;
  trim: "q1" | "q2" | "q3";
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
  const { subjects, teachers, trayectosList, proyectionId, subjectColors, handleSubjectChange, lockedSections, setLockedSections, userData, userPerfil } =
    useContext(MainContext) as MainContextValues;

  const { addSubjectToTeacher } = useSetSubject(subjects || []);

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

  // State for unassigned subject drop classroom selection
  const [unassignedDropData, setUnassignedDropData] = useState<{
    targetDay: number;
    targetStartTime: string;
    eventsToDrop: Event[];
    isBlockDrag: boolean;
    subjectId: string;
  } | null>(null);

  const [isFrozenManagerOpen, setIsFrozenManagerOpen] = useState(false);
  const [frozenPnfFilter, setFrozenPnfFilter] = useState<string[]>([]);
  const [frozenModalTab, setFrozenModalTab] = useState<"q1" | "q2" | "q3">("q1");
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);

  // Staging area state for official stage
  const [isOfficialStageMode, setIsOfficialStageMode] = useState(false);
  const [draggingFromStaging, setDraggingFromStaging] = useState<Event | null>(null);
  const [dropPreview, setDropPreview] = useState<{ day: number; startTime: string } | null>(null);
  const [confirmStagingLoading, setConfirmStagingLoading] = useState(false);
  const [pendingLockedSectionSaves, setPendingLockedSectionSaves] = useState<PendingLockedSectionSave[]>([]);
  const [eventsWithConflicts, setEventsWithConflicts] = useState<Record<string, string[]>>({}); // eventId -> conflict messages
  const STAGING_PANEL_WIDTH = 320;

  // Detectar conflictos de doble-asignación de profesor: cuando un mismo profesor
  // tiene dos clases asignadas en el mismo día/hora pero en distintas secciones/aulas.
  // Esto ocurre típicamente al cambiar el profesor de una materia congelada en fase 2,
  // si el nuevo profesor ya tiene otra clase en ese horario.
  const professorMismatchConflicts = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!subjects) return map;

    // Unir todas las secciones bloqueadas del trimestre actual
    const allLockedEvents: Event[] = [];
    Object.entries(lockedSections || {}).forEach(([key, events]) => {
      if (!key.endsWith(`-${trimestre}`)) return;
      allLockedEvents.push(...events);
    });

    // Detectar colisiones profesor+día+hora
    for (let i = 0; i < allLockedEvents.length; i++) {
      const a = allLockedEvents[i];
      const profA = a.extendedProps?.professorId;
      if (!profA) continue;
      const dayA = a.daysOfWeek?.[0];
      const startA = a.startTime;

      for (let j = 0; j < allLockedEvents.length; j++) {
        if (i === j) continue;
        const b = allLockedEvents[j];
        if (b.extendedProps?.professorId !== profA) continue;
        if (b.daysOfWeek?.[0] !== dayA) continue;
        if (b.startTime !== startA) continue;
        // Mismo profesor + mismo día + misma hora pero distinta sección/materia → conflicto
        const sameSection =
          a.extendedProps?.pnfId === b.extendedProps?.pnfId &&
          a.extendedProps?.trayectoId === b.extendedProps?.trayectoId &&
          a.extendedProps?.seccion === b.extendedProps?.seccion &&
          a.extendedProps?.subjectId === b.extendedProps?.subjectId;
        if (sameSection) continue;

        const prof = teachers?.find(t => t.id === profA);
        const profName = prof ? `${prof.name} ${prof.lastName}` : 'Profesor';
        const eventId = `${a.extendedProps?.subjectId}-${a.extendedProps?.seccion}-${dayA}-${startA}`;
        const msg = `Conflicto de profesor: ${profName} también tiene clase de "${b.title}" a esta hora`;
        const existing = map.get(eventId) || [];
        if (!existing.includes(msg)) existing.push(msg);
        map.set(eventId, existing);
      }
    }
    return map;
  }, [lockedSections, subjects, trimestre, teachers]);

  const isSuperUser = useMemo(() => {
    if (userData?.su) return true;
    const superProfiles = ["ADMIN", "COORDINADOR", "SUPERUSER"];
    return userPerfil?.some(p => superProfiles.includes(p.toUpperCase())) || false;
  }, [userData, userPerfil]);

  const toggleFreezeSection = (pnfId: string, trayId: string, sec: string, specificTrimestre?: "q1" | "q2" | "q3") => {
    const trim = specificTrimestre || trimestre;
    const key = `${pnfId}-${trayId}-${sec}-${trim}`;
    const isLocked = !!lockedSections[key];

    if (isLocked) {
      if (!isSuperUser) {
        message.error("Solo los Super Usuarios pueden desbloquear secciones.");
        return;
      }
      Modal.confirm({
        title: "¿Desbloquear sección?",
        content: "Al desbloquear esta sección, las materias se recalcularán automáticamente en el próximo proceso de generación y su orden o ubicación podrían cambiar. ¿Deseas continuar?",
        okText: "Sí, desbloquear",
        cancelText: "Cancelar",
        onOk: () => {
          setLockedSections((prev: any) => {
            const newObj = { ...prev };
            delete newObj[key];
            message.info(`Sección ${sec} desbloqueada.`);
            return newObj;
          });
          setIsOfficialStageMode(false);
        }
      });
    } else {
      setLockedSections((prev: any) => {
        const newObj = { ...prev };
        // Collect unmerged events for this section (only schedule events)
        const sectionEvents = getScheduleEvents(eventData).filter(e =>
          e.extendedProps.pnfId === pnfId &&
          e.extendedProps.trayectoId === trayId &&
          e.extendedProps.seccion === sec
        );
        newObj[key] = sectionEvents;
        message.success(`Sección ${sec} bloqueada.`);
        return newObj;
      });
    }
  };

  const enqueueLockedSectionSaveFromEvents = (...eventsToSave: (Event | null | undefined)[]) => {
    setPendingLockedSectionSaves(prev => {
      const next = [...prev];
      const knownKeys = new Set(next.map(item => item.key));

      for (const evt of eventsToSave) {
        const pnfId = evt?.extendedProps?.pnfId;
        const trayId = evt?.extendedProps?.trayectoId;
        const sec = evt?.extendedProps?.seccion;
        if (!pnfId || !trayId || !sec) continue;

        const key = `${pnfId}-${trayId}-${sec}-${trimestre}`;
        if (!lockedSections[key] || knownKeys.has(key)) continue;

        knownKeys.add(key);
        next.push({
          key,
          pnfId,
          trayectoId: trayId,
          seccion: sec,
          trim: trimestre,
        });
      }

      return next;
    });
  };

  useEffect(() => {
    if (!proyectionId || pendingLockedSectionSaves.length === 0) return;

    let cancelled = false;
    const queue = [...pendingLockedSectionSaves];
    setPendingLockedSectionSaves([]);

    const persistQueuedSections = async () => {
      for (const section of queue) {
        const sectionEvents = getScheduleEvents(eventData).filter(e =>
          e.extendedProps?.pnfId === section.pnfId &&
          e.extendedProps?.trayectoId === section.trayectoId &&
          e.extendedProps?.seccion === section.seccion
        );

        try {
          const response = await upsertLockedSection(proyectionId, section.key, sectionEvents);
          if (response?.error) {
            console.error("Error persisting locked section changes:", section.key, response);
            continue;
          }
          if (cancelled) return;
          setLockedSections(prev => ({
            ...prev,
            [section.key]: sectionEvents,
          }));
        } catch (error) {
          console.error("Error persisting locked section changes:", section.key, error);
        }
      }
    };

    persistQueuedSections();

    return () => {
      cancelled = true;
    };
  }, [pendingLockedSectionSaves, proyectionId, eventData, setLockedSections]);

  // Staging area functions for official stage mode
  const getEventId = (event: Event): string => {
    // Include section to make ID unique across different sections with same subject
    return `${event.extendedProps?.subjectId}-${event.extendedProps?.seccion}-${event.daysOfWeek?.[0]}-${event.startTime}`;
  };

  // Helpers for filtering events by location (schedule vs staging)
  const getScheduleEvents = (events: Event[]): Event[] =>
    events.filter(e => e.extendedProps?.location !== 'staging');

  const getStagingEvents = (events: Event[]): Event[] =>
    events.filter(e => e.extendedProps?.location === 'staging');

  const moveEventToStaging = (event: Event) => {
    if (!isOfficialStageMode) return;

    const day = event.daysOfWeek?.[0];
    const subjectId = event.extendedProps?.subjectId;
    const seccion = event.extendedProps?.seccion;

    if (!day || !subjectId || !seccion) {
      const singleEventId = getEventId(event);
      if (getStagingEvents(eventData).some(e => getEventId(e) === singleEventId)) {
        message.warning("Este evento ya está en el área de depósito");
        return;
      }
      // Change location to 'staging' instead of moving between arrays
      setEventData(prev => prev.map(e => {
        if (getEventId(e) === singleEventId) {
          return { ...e, extendedProps: { ...e.extendedProps, location: 'staging' as const } };
        }
        return e;
      }));
      message.info("Evento movido al área de depósito");
      return;
    }

    // Enhanced block detection that handles gaps
    const allSubjectEvents = getScheduleEvents(eventData).filter(e =>
      e.daysOfWeek?.[0] === day &&
      e.extendedProps?.subjectId === subjectId &&
      e.extendedProps?.seccion === seccion
    );

    // Sort events by start time
    allSubjectEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Find the block that contains the current event
    const eventIndex = allSubjectEvents.findIndex(e => getEventId(e) === getEventId(event));
    
    // Find all consecutive events (including gaps) that form a block
    const blockEvents = [event];
    
    // Look backward for consecutive events
    for (let i = eventIndex - 1; i >= 0; i--) {
      const prevEvent = allSubjectEvents[i];
      const prevEndTime = prevEvent.endTime;
      const currentStartTime = blockEvents[0].startTime;
      
      // Check if events are reasonably close (within 30 minutes gap)
      const timeDiff = getTimeDifferenceInMinutes(prevEndTime, currentStartTime);
      if (timeDiff <= 30) {
        blockEvents.unshift(prevEvent);
      } else {
        break; // Gap too large, stop looking backward
      }
    }
    
    // Look forward for consecutive events
    for (let i = eventIndex + 1; i < allSubjectEvents.length; i++) {
      const nextEvent = allSubjectEvents[i];
      const currentEndTime = blockEvents[blockEvents.length - 1].endTime;
      const nextStartTime = nextEvent.startTime;
      
      // Check if events are reasonably close (within 30 minutes gap)
      const timeDiff = getTimeDifferenceInMinutes(currentEndTime, nextStartTime);
      if (timeDiff <= 30) {
        blockEvents.push(nextEvent);
      } else {
        break; // Gap too large, stop looking forward
      }
    }

    const eventsToMove = blockEvents.length > 1 ? blockEvents : [event];
    const eventsToMoveIds = new Set(eventsToMove.map(e => getEventId(e)));

    const allAlreadyStaged = eventsToMove.every(e =>
      getStagingEvents(eventData).some(se => getEventId(se) === getEventId(e))
    );
    if (allAlreadyStaged) {
      message.warning("Este bloque ya está en el área de depósito");
      return;
    }

    // Change location to 'staging' instead of moving between arrays
    setEventData(prev => prev.map(e => {
      if (eventsToMoveIds.has(getEventId(e))) {
        return { ...e, extendedProps: { ...e.extendedProps, location: 'staging' as const } };
      }
      return e;
    }));
    message.info(`Bloque movido al área de depósito (${eventsToMove.length} hora(s))`);
  };

  // Helper function to calculate time difference in minutes
  const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);
    
    const date1 = new Date();
    date1.setHours(hours1, minutes1, 0, 0);
    
    const date2 = new Date();
    date2.setHours(hours2, minutes2, 0, 0);
    
    return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60);
  };

  // Handle drop from schedule onto staging area
  const handleDropFromSchedule = (event: Event) => {
    if (!isOfficialStageMode) {
      message.warning("El modo de depósito solo está disponible en modo oficial");
      return;
    }
    moveEventToStaging(event);
  };

  // Handle drop of unassigned subject events to schedule
  const handleDropUnassignedEvents = (targetDay: number, targetStartTime: string, eventsToDrop: Event[], isBlockDrag: boolean) => {
    if (eventsToDrop.length === 0) return;

    const subjectId = eventsToDrop[0].extendedProps?.subjectId;
    if (!subjectId) {
      message.error("No se puede agregar esta materia: falta información del subjectId");
      return;
    }

    const subject = schedulableSubjectsRef.current?.find(s => s.innerId === subjectId);
    if (!subject) {
      message.error("No se encontró la materia en la lista de materias");
      return;
    }

    const slotIndex = tableSlots.findIndex(s => s[0] === targetStartTime);
    if (slotIndex < 0) {
      message.error("No se encontró el slot de tiempo");
      return;
    }

    // Store drop data and show classroom selection modal
    setUnassignedDropData({
      targetDay,
      targetStartTime,
      eventsToDrop,
      isBlockDrag,
      subjectId,
    });
    setNewClassroomId("");
  };

  // Handle classroom selection confirmation for unassigned subjects
  const handleUnassignedClassroomConfirm = () => {
    if (!unassignedDropData || !newClassroomId) {
      message.warning("Por favor seleccione un aula");
      return;
    }

    const { targetDay, targetStartTime, eventsToDrop, isBlockDrag, subjectId } = unassignedDropData;
    const subject = schedulableSubjectsRef.current?.find(s => s.innerId === subjectId);
    if (!subject) {
      message.error("No se encontró la materia en la lista de materias");
      return;
    }

    const selectedClassroom = classrooms.find(c => c.id === newClassroomId);
    if (!selectedClassroom) {
      message.error("No se encontró el aula seleccionada");
      return;
    }

    const slotIndex = tableSlots.findIndex(s => s[0] === targetStartTime);
    if (slotIndex < 0) {
      message.error("No se encontró el slot de tiempo");
      return;
    }

    const newEvents: Event[] = [];
    let currentSlotIndex = slotIndex;

    for (let i = 0; i < eventsToDrop.length; i++) {
      if (currentSlotIndex >= tableSlots.length) {
        message.warning(`Solo se pudieron agregar ${i} de ${eventsToDrop.length} horas (falta espacio en el horario)`);
        break;
      }

      const slot = tableSlots[currentSlotIndex];
      const newEvent: Event = {
        title: subject.subject,
        daysOfWeek: [targetDay],
        startTime: slot[0],
        endTime: slot[1],
        extendedProps: {
          subjectId: subject.innerId,
          seccion: eventsToDrop[i].extendedProps?.seccion,
          trayectoId: eventsToDrop[i].extendedProps?.trayectoId || '',
          pnfId: eventsToDrop[i].extendedProps?.pnfId || '',
          professorId: eventsToDrop[i].extendedProps?.professorId || null,
          classroomId: selectedClassroom.id,
          classroomName: selectedClassroom.classroom,
          pnfName: eventsToDrop[i].extendedProps?.pnfName || '',
          turnName: eventsToDrop[i].extendedProps?.turnName || '',
          blockId: `${targetDay}-${subject.innerId}`,
          location: 'schedule' as const,
        },
      };

      newEvents.push(newEvent);
      currentSlotIndex++;
    }

    if (newEvents.length === 0) {
      message.error("No se pudo agregar ninguna hora");
      return;
    }

    // Add events to eventData
    setEventData(prev => [...prev, ...newEvents]);

    // Check conflicts for each new event
    const allConflicts: { event: Event; conflicts: string[] }[] = [];
    for (const newEv of newEvents) {
      const c = checkEventConflicts(newEv, targetDay, newEv.startTime);
      if (c.length > 0) allConflicts.push({ event: newEv, conflicts: c });
    }

    // Update conflict visual indicators
    setEventsWithConflicts(prev => {
      const updated = { ...prev };
      allConflicts.forEach(({ event: ev, conflicts: c }) => { updated[getEventId(ev)] = c; });
      return updated;
    });

    // Handle error removal based on whether it's a block drag or individual hour
    const firstEvent = eventsToDrop[0];

    if (isBlockDrag) {
      // Block drag - remove the entire error
      setErrors(prev => prev.filter(e =>
        e.subjectId !== subjectId ||
        e.seccion !== firstEvent.extendedProps?.seccion ||
        e.pnfId !== firstEvent.extendedProps?.pnfId
      ));
    } else {
      // Individual hour - reduce totalHours of the error
      setErrors(prev => prev.map(e => {
        if (e.subjectId === subjectId &&
            e.seccion === firstEvent.extendedProps?.seccion &&
            e.pnfId === firstEvent.extendedProps?.pnfId) {
          const newTotalHours = (e.totalHours || 1) - newEvents.length;
          if (newTotalHours <= 0) {
            return null;
          }
          return { ...e, totalHours: newTotalHours };
        }
        return e;
      }).filter(e => e !== null));
    }

    // Show appropriate message based on conflicts
    if (allConflicts.length > 0) {
      message.warning(`${isBlockDrag ? 'Materia' : 'Hora'} de "${subject.subject}" agregada con ${allConflicts.length} conflicto(s) (${newEvents.length} hora(s))`);
    } else {
      message.success(`${isBlockDrag ? 'Materia' : 'Hora'} de "${subject.subject}" agregada (${newEvents.length} hora(s))`);
    }

    // Track locked section saves
    newEvents.forEach(ev => enqueueLockedSectionSaveFromEvents(ev, null));

    // Clear modal state
    setUnassignedDropData(null);
    setNewClassroomId("");
  };

  // Handle removing entire group from staging
  const removeGroupFromStaging = (events: Event[]) => {
    if (events.length === 0) return;
    
    // Check conflicts for all events in the group
    const allConflicts: { event: Event; conflicts: string[] }[] = [];
    
    for (const eventToCheck of events) {
      const targetDay = eventToCheck.daysOfWeek?.[0];
      const targetStartTime = eventToCheck.startTime;
      
      if (targetDay && targetStartTime) {
        const conflicts = checkEventConflicts(eventToCheck, targetDay, targetStartTime);
        if (conflicts.length > 0) {
          allConflicts.push({ event: eventToCheck, conflicts });
        }
      }
    }

    if (allConflicts.length > 0) {
      // Show warning with all conflicts in the group
      Modal.warning({
        title: "Materia con Conflictos",
        content: (
          <div>
            <p>No se puede devolver la materia completa porque algunas horas están ocupadas:</p>
            <div style={{ maxHeight: '250px', overflowY: 'auto', margin: '10px 0' }}>
              {allConflicts.map(({ event: conflictEvent, conflicts }, index) => (
                <div key={index} style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fff2f0', borderRadius: '4px' }}>
                  <strong>{conflictEvent.title} - {conflictEvent.startTime}</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '15px', fontSize: '12px' }}>
                    {conflicts.map((conflict, conflictIndex) => (
                      <li key={conflictIndex}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p>Por favor, resuelve los conflictos manualmente o arrastra las horas a celdas disponibles.</p>
          </div>
        ),
        width: 600,
        okText: "Entendido"
      });
      return; // Prevent the action
    }

    // If no conflicts, proceed with removal of the entire group
    const eventsToReturnIds = new Set(events.map(e => getEventId(e)));
    // Change location to 'schedule' instead of moving between arrays
    setEventData(prev => {
      // Change location to 'schedule' for events being returned
      const updated = prev.map(e => {
        if (eventsToReturnIds.has(getEventId(e))) {
          return { ...e, extendedProps: { ...e.extendedProps, location: 'schedule' as const } };
        }
        return e;
      });
      return updated;
    });
    message.info(`Materia devuelta al horario (${events.length} hora(s))`);
  };

  const clearAllStaged = () => {
    const currentStagedEvents = getStagingEvents(eventData);
    if (currentStagedEvents.length === 0) return;
    
    // Check for conflicts in all staged events
    const conflictsByEvent: { event: Event; conflicts: string[] }[] = [];
    
    for (const event of currentStagedEvents) {
      const targetDay = event.daysOfWeek?.[0];
      const targetStartTime = event.startTime;
      
      if (targetDay && targetStartTime) {
        const conflicts = checkEventConflicts(event, targetDay, targetStartTime);
        if (conflicts.length > 0) {
          conflictsByEvent.push({ event, conflicts });
        }
      }
    }
    
    if (conflictsByEvent.length > 0) {
      // Show warning with all conflicts
      Modal.warning({
        title: "Conflictos al Devolver Eventos",
        content: (
          <div>
            <p>No se pueden devolver {conflictsByEvent.length} eventos porque sus ubicaciones originales están ocupadas:</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '10px 0' }}>
              {conflictsByEvent.map(({ event, conflicts }, index) => (
                <div key={index} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff2f0', borderRadius: '4px' }}>
                  <strong>{event.title}</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '12px' }}>
                    {conflicts.map((conflict, conflictIndex) => (
                      <li key={conflictIndex}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p>Por favor, resuelve los conflictos manualmente arrastrando las materias a celdas disponibles.</p>
          </div>
        ),
        width: 600,
        okText: "Entendido"
      });
      return; // Prevent the action
    }
    
    // If no conflicts, proceed with confirmation
    Modal.confirm({
      title: "¿Limpiar área de depósito?",
      content: `Se devolverán ${currentStagedEvents.length} eventos al horario.`,
      okText: "Sí, devolver todos",
      cancelText: "Cancelar",
      onOk: () => {
        // Change location to 'schedule' for all staged events
        setEventData(prev => {
          const updated = prev.map(e => {
            if (e.extendedProps?.location === 'staging') {
              return { ...e, extendedProps: { ...e.extendedProps, location: 'schedule' as const } };
            }
            return e;
          });
          return updated;
        });
        message.success("Todos los eventos devueltos al horario");
      }
    });
  };

  const handleConfirmStagingChanges = async () => {
    if (!proyectionId) {
      message.error("No se pudo identificar la proyección para guardar cambios");
      return;
    }

    const sectionKey = `${pnf}-${trayectoId}-${seccion}-${trimestre}`;
    if (!lockedSections[sectionKey]) {
      message.warning("La sección debe estar congelada para confirmar cambios oficiales");
      return;
    }

    const sectionEvents = eventData.filter(e =>
      e.extendedProps?.pnfId === pnf &&
      e.extendedProps?.trayectoId === trayectoId &&
      e.extendedProps?.seccion === seccion
    );

    setConfirmStagingLoading(true);
    try {
      const response = await upsertLockedSection(proyectionId, sectionKey, sectionEvents);
      if (response?.error) {
        message.error("No se pudieron guardar los cambios del depósito en la base de datos");
        return;
      }

      setLockedSections(prev => ({
        ...prev,
        [sectionKey]: sectionEvents,
      }));

      setDraggingFromStaging(null);
      setIsOfficialStageMode(false);
      message.success("Cambios confirmados y guardados correctamente");
    } catch (error) {
      console.error("Error confirming staging changes:", error);
      message.error("Error al guardar los cambios del depósito");
    } finally {
      setConfirmStagingLoading(false);
    }
  };

  // Check conflicts for an event at a specific position
  const checkEventConflicts = (event: Event, targetDay: number, targetStartTime: string, eventsToCheck: Event[] = getScheduleEvents(eventData)): string[] => {
    const conflicts: string[] = [];
    const props = event.extendedProps;
    if (!props) return conflicts;

    const professorId = props.professorId;
    const classroomId = props.classroomId;
    const pnfId = props.pnfId;
    const trayectoId = props.trayectoId;
    const seccion = props.seccion;

    // Check all existing events for conflicts
    for (const existingEvent of eventsToCheck) {
      if (!existingEvent.extendedProps) continue;
      const existingDay = existingEvent.daysOfWeek?.[0];
      const existingStart = existingEvent.startTime;
      
      // Skip if different day or time
      if (existingDay !== targetDay || existingStart !== targetStartTime) continue;
      
      // Skip if same event (shouldn't happen but just in case)
      if (getEventId(existingEvent) === getEventId(event)) continue;

      // Check professor conflict
      if (professorId && existingEvent.extendedProps.professorId === professorId) {
        const prof = teachers?.find((t: { id: string; name?: string; lastName?: string }) => t.id === professorId);
        const profName = prof ? `${prof.name || ''} ${prof.lastName || ''}`.trim() : 'Profesor';
        conflicts.push(`Conflicto de profesor: ${profName} ya tiene clase a esta hora con "${existingEvent.title}"`);
      }

      // Check classroom conflict
      if (classroomId && existingEvent.extendedProps.classroomId === classroomId) {
        const classroom = classrooms?.find((c: { id: string; classroom?: string }) => String(c.id) === String(classroomId));
        conflicts.push(`Conflicto de aula: ${classroom?.classroom || 'Aula'} ya está ocupada a esta hora por "${existingEvent.title}"`);
      }

      // Check section conflict (same PNF, trayecto, section)
      if (pnfId === existingEvent.extendedProps.pnfId && 
          trayectoId === existingEvent.extendedProps.trayectoId && 
          seccion === existingEvent.extendedProps.seccion) {
        conflicts.push(`Conflicto de sección: La sección ${seccion} ya tiene clase a esta hora con "${existingEvent.title}"`);
      }
    }

    return conflicts;
  };

  // Handle drop from staging area to schedule
  const handleDropFromStaging = (
    targetDay: number,
    targetStartTime: string,
    _targetEndTime: string,
    eventFromDrop?: Event | Event[],
    _targetOccupyingEvent?: Event,
    isBlockDrag?: boolean
  ) => {
    // Handle block drag from staging header (array of events)
    if (isBlockDrag && Array.isArray(eventFromDrop) && eventFromDrop.length > 0) {
      const eventsToMove = eventFromDrop;
      processStagingDrop(targetDay, targetStartTime, eventsToMove);
      return;
    }

    // Handle individual event drag
    const eventToUse = Array.isArray(eventFromDrop) ? eventFromDrop[0] : (eventFromDrop || draggingFromStaging);
    if (!eventToUse) return;

    // For individual drag, only move the single event (no block detection)
    processStagingDrop(targetDay, targetStartTime, [eventToUse]);
  };

  // Helper to add minutes to a time string (HH:MM)
  const addMinutesToTime = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Helper to get signed time difference in minutes (time2 - time1)
  const getSignedTimeDiff = (time1: string, time2: string): number => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const processStagingDrop = (targetDay: number, targetStartTime: string, eventsToMove: Event[]) => {
    const isSameSubjectAndSection = (a: Event, b: Event) =>
      String(a.extendedProps?.subjectId) === String(b.extendedProps?.subjectId) &&
      String(a.extendedProps?.seccion) === String(b.extendedProps?.seccion);

    // Sort events by start time to ensure correct offset calculation
    const sortedEvents = [...eventsToMove].sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Calculate time offset: difference between first event's original start and the drop target
    const timeOffsetMinutes = getSignedTimeDiff(sortedEvents[0].startTime, targetStartTime);

    // Process each event in the block
    const processedEvents: Event[] = [];
    const conflicts: { event: Event; conflicts: string[] }[] = [];
    const swappedOutEvents: Event[] = [];

    for (const event of sortedEvents) {
      // Apply time offset to get the new start/end times
      const newStartTime = addMinutesToTime(event.startTime, timeOffsetMinutes);
      const newEndTime = addMinutesToTime(event.endTime, timeOffsetMinutes);

      // Event currently occupying drop target (if any) - only check schedule events
      const occupyingEvent = getScheduleEvents(eventData).find(e => {
        if (String(e.daysOfWeek?.[0]) !== String(targetDay) || e.startTime !== newStartTime) return false;
        if (!event.extendedProps) return true;
        return (
          String(e.extendedProps?.pnfId) === String(event.extendedProps.pnfId) &&
          String(e.extendedProps?.trayectoId) === String(event.extendedProps.trayectoId) &&
          String(e.extendedProps?.seccion) === String(event.extendedProps.seccion)
        );
      });

      let swappedOutEvent: Event | null = null;

      // If dropping over occupied slot, decide merge/swap behavior
      if (occupyingEvent) {
        if (isSameSubjectAndSection(occupyingEvent, event)) {
          // Same subject/section: skip this event (already in schedule)
          continue;
        } else {
          // Different subject/section: swap
          swappedOutEvent = occupyingEvent;
        }
      }

      // Create new event with updated day/time at the drop target position
      const newEvent: Event = {
        ...event,
        daysOfWeek: [targetDay],
        startTime: newStartTime,
        endTime: newEndTime,
      };

      // Check conflicts for this event
      const eventConflicts = checkEventConflicts(newEvent, targetDay, newStartTime);
      if (eventConflicts.length > 0) {
        conflicts.push({ event: newEvent, conflicts: eventConflicts });
      }

      processedEvents.push(newEvent);
      if (swappedOutEvent) {
        swappedOutEvents.push(swappedOutEvent);
      }
    }

    if (processedEvents.length === 0) {
      message.warning("No hay eventos válidos para mover en este bloque");
      return;
    }

    // Check if any events have conflicts - allow movement but show visual indicators
    if (conflicts.length > 0) {
      // Update conflict visual indicators for events with conflicts
      setEventsWithConflicts(prev => {
        const updated = { ...prev };
        conflicts.forEach(({ event: conflictEvent, conflicts: eventConflicts }) => {
          updated[getEventId(conflictEvent)] = eventConflicts;
        });
        return updated;
      });
      
      message.warning(`Bloque reubicado con ${conflicts.length} conflicto(s) (${processedEvents.length} eventos)`);
    } else {
      message.success(`Bloque reubicado en el horario (${processedEvents.length} eventos)`);
    }

    // Change location for all events being moved and swapped
    const eventsToMoveIds = new Set(eventsToMove.map(e => getEventId(e)));
    const swappedOutIds = new Set(swappedOutEvents.map(e => getEventId(e)));

    setEventData(prev => {
      // Remove original events from staging by their IDs to prevent duplication
      let updated = prev.filter(e => !eventsToMoveIds.has(getEventId(e)));

      // Change location: swapped events to 'staging'
      updated = updated.map(e => {
        if (swappedOutIds.has(getEventId(e))) {
          return { ...e, extendedProps: { ...e.extendedProps, location: 'staging' as const } };
        }
        return e;
      });

      // Add processed events with location: 'schedule'
      const newEvents = processedEvents.map(e => ({
        ...e,
        extendedProps: { ...e.extendedProps, location: 'schedule' as const }
      }));

      return [...updated, ...newEvents];
    });

    // Track locked section saves for all events
    processedEvents.forEach(event => {
      enqueueLockedSectionSaveFromEvents(event, null);
    });
    swappedOutEvents.forEach(event => {
      enqueueLockedSectionSaveFromEvents(null, event);
    });

    setDraggingFromStaging(null);
  };

  // Handle drop between schedule cells (in official stage mode)
  const handleDropBetweenCells = (targetDay: number, targetStartTime: string, _targetEndTime: string, sourceEvent: Event) => {
    const sourceDay = sourceEvent.daysOfWeek?.[0];
    const subjectId = sourceEvent.extendedProps?.subjectId;
    const seccion = sourceEvent.extendedProps?.seccion;

    // Use != null to allow falsy values like 0 or "0", and String() for type-safe comparison
    const hasRequiredProps = sourceDay != null && subjectId != null && seccion != null;

    // Find the consecutive block that contains the dragged event
    // (same subject, section, day, AND within 30-minute gaps)
    let blockEvents: Event[] = [];
    if (hasRequiredProps) {
      const allSubjectEvents = getScheduleEvents(eventData).filter(e =>
        String(e.daysOfWeek?.[0]) === String(sourceDay) &&
        String(e.extendedProps?.subjectId) === String(subjectId) &&
        String(e.extendedProps?.seccion) === String(seccion)
      ).sort((a, b) => a.startTime.localeCompare(b.startTime));

      const eventIndex = allSubjectEvents.findIndex(e => getEventId(e) === getEventId(sourceEvent));
      if (eventIndex >= 0) {
        const block = [allSubjectEvents[eventIndex]];

        // Look backward for consecutive events (within 30-min gap)
        for (let i = eventIndex - 1; i >= 0; i--) {
          const timeDiff = getTimeDifferenceInMinutes(allSubjectEvents[i].endTime, block[0].startTime);
          if (timeDiff <= 30) {
            block.unshift(allSubjectEvents[i]);
          } else {
            break;
          }
        }

        // Look forward for consecutive events (within 30-min gap)
        for (let i = eventIndex + 1; i < allSubjectEvents.length; i++) {
          const timeDiff = getTimeDifferenceInMinutes(block[block.length - 1].endTime, allSubjectEvents[i].startTime);
          if (timeDiff <= 30) {
            block.push(allSubjectEvents[i]);
          } else {
            break;
          }
        }

        blockEvents = block;
      }
    }

    // Fallback: if we can't find block events, move only the dragged event
    if (blockEvents.length === 0) {
      const oldId = getEventId(sourceEvent);
      const newEvent: Event = { ...sourceEvent, daysOfWeek: [targetDay], startTime: targetStartTime, endTime: _targetEndTime };
      setEventData(prev => [...prev.filter(e => getEventId(e) !== oldId), newEvent]);
      enqueueLockedSectionSaveFromEvents(newEvent);
      message.success("Evento movido correctamente");
      return;
    }

    // Build a map from slot start time to slot index for fast lookup
    const slotStartToIndex = new Map<string, number>();
    tableSlots.forEach((s, idx) => slotStartToIndex.set(s[0], idx));

    // Helper: find the slot index for a given time (exact match or nearest)
    const findSlotIndex = (time: string): number => {
      const exact = slotStartToIndex.get(time);
      if (exact != null) return exact;
      // Find nearest slot by time proximity
      const [h, m] = time.split(':').map(Number);
      const minutes = h * 60 + m;
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < tableSlots.length; i++) {
        const [sh, sm] = tableSlots[i][0].split(':').map(Number);
        const diff = Math.abs(sh * 60 + sm - minutes);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      }
      return bestIdx;
    };

    // Calculate slot-based offset (preserves alignment with table slots)
    const sourceSlotIdx = findSlotIndex(sourceEvent.startTime);
    const targetSlotIdx = findSlotIndex(targetStartTime);
    const slotOffset = targetSlotIdx - sourceSlotIdx;

    // Build new events by applying slot offset to each individual event
    const oldIds = new Set(blockEvents.map(e => getEventId(e)));
    const newEvents: Event[] = [];
    for (const ev of blockEvents) {
      const evStartIdx = findSlotIndex(ev.startTime);
      const newStartIdx = evStartIdx + slotOffset;

      // Find the end slot index for this event
      const evEndIdx = tableSlots.findIndex(s => s[1] === ev.endTime);
      const newEndIdx = (evEndIdx >= 0 ? evEndIdx : evStartIdx) + slotOffset;

      // Validate new indices are within bounds
      if (newStartIdx < 0 || newStartIdx >= tableSlots.length || newEndIdx < 0 || newEndIdx >= tableSlots.length) {
        message.error(`No se puede mover el bloque: quedaría fuera del horario`);
        return;
      }

      newEvents.push({
        ...ev,
        daysOfWeek: [targetDay],
        startTime: tableSlots[newStartIdx][0],
        endTime: tableSlots[newEndIdx][1],
        extendedProps: {
          ...ev.extendedProps,
          blockId: `${targetDay}-${subjectId}`,
        },
      });
    }

    // Check conflicts for each new event (excluding the block's own old events)
    const eventsToCheck = eventData.filter(e => !oldIds.has(getEventId(e)));
    const allConflicts: { event: Event; conflicts: string[] }[] = [];
    for (const newEv of newEvents) {
      const c = checkEventConflicts(newEv, targetDay, newEv.startTime, eventsToCheck);
      if (c.length > 0) allConflicts.push({ event: newEv, conflicts: c });
    }

    // Apply the move: remove old events, add new ones
    setEventData(prev => [...prev.filter(e => !oldIds.has(getEventId(e))), ...newEvents]);
    newEvents.forEach(ev => enqueueLockedSectionSaveFromEvents(ev));

    // Update conflict visual indicators
    setEventsWithConflicts(prev => {
      const updated = { ...prev };
      oldIds.forEach(id => delete updated[id]);
      allConflicts.forEach(({ event: ev, conflicts: c }) => { updated[getEventId(ev)] = c; });
      return updated;
    });

    if (allConflicts.length > 0) {
      message.warning(`Bloque movido con ${allConflicts.length} conflicto(s) (${newEvents.length} horas)`);
    } else {
      message.success(`Bloque movido correctamente (${newEvents.length} horas)`);
    }
  };

  const toggleFreezeTrayecto = (pnfId: string, trayId: string, trayName: string, sections: string[], isCurrentlyFrozen: boolean, specificTrimestre?: "q1" | "q2" | "q3") => {
    const trim = specificTrimestre || trimestre;

    if (isCurrentlyFrozen) {
      if (!isSuperUser) {
        message.error("Solo los Super Usuarios pueden descongelar trayectos.");
        return;
      }
      Modal.confirm({
        title: "¿Descongelar trayecto completo?",
        content: `Vas a descongelar todas las secciones del trayecto ${trayName}. Las materias se recalcularán y el orden actual podría perderse. ¿Deseas continuar?`,
        okText: "Sí, descongelar todo",
        cancelText: "Cancelar",
        onOk: () => {
          setLockedSections(prev => {
            const newObj = { ...prev };
            sections.forEach(sec => delete newObj[`${pnfId}-${trayId}-${sec}-${trim}`]);
            message.info(`Trayecto ${trayName} descongelado.`);
            return newObj;
          });
        }
      });
    } else {
      setLockedSections(prev => {
        const newObj = { ...prev };
        sections.forEach(sec => {
          const key = `${pnfId}-${trayId}-${sec}-${trim}`;
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
        return newObj;
      });
    }
  };

  const toggleFreezePnf = (pnfId: string, pnfName: string, sectionsMap: Array<{ trayId: string, sec: string }>, isCurrentlyFrozen: boolean, specificTrimestre?: "q1" | "q2" | "q3") => {
    const trim = specificTrimestre || trimestre;

    if (isCurrentlyFrozen) {
      if (!isSuperUser) {
        message.error("Solo los Super Usuarios pueden descongelar PNFs completos.");
        return;
      }
      Modal.confirm({
        title: `¿Descongelar PNF ${pnfName}?`,
        content: `Esta acción descongelará absolutamente todas las secciones de este PNF. El generador intentará reubicar todas las materias, lo que cambiará el horario actual. ¿Deseas continuar?`,
        okText: "Sí, descongelar PNF",
        cancelText: "Cancelar",
        onOk: () => {
          setLockedSections(prev => {
            const newObj = { ...prev };
            sectionsMap.forEach(({ trayId, sec }) => delete newObj[`${pnfId}-${trayId}-${sec}-${trim}`]);
            message.info(`PNF ${pnfName} descongelado.`);
            return newObj;
          });
        }
      });
    } else {
      setLockedSections(prev => {
        const newObj = { ...prev };
        sectionsMap.forEach(({ trayId, sec }) => {
          const key = `${pnfId}-${trayId}-${sec}-${trim}`;
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
        return newObj;
      });
    }
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
    const allEvents = [...loadedScheduleEvents, ...getScheduleEvents(eventData)];
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
    const allEventsForConflict = [...loadedScheduleEvents, ...getScheduleEvents(eventData)];
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

    const applyClassroomChangeAndRecalculate = (returnFirstModifiedOnly = false) => {
      const allEvents = [...loadedScheduleEvents, ...getScheduleEvents(eventData)];

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
        if (returnFirstModifiedOnly) return null;
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

      if (returnFirstModifiedOnly) return firstModified;

      // Recalcular todo el horario alrededor de este nuevo evento fijo
      setGenerationCounter((prev) => prev + 1);



      message.success(
        `Aula cambiada a "${newClassroom.classroom}" para ${classroomChangeEvent.title} el día seleccionado.`
      );
      setClassroomChangeEvent(null);
      setNewClassroomId("");
    };

    const firstModifiedEvent = applyClassroomChangeAndRecalculate(true) as any;
    const isFrozen = firstModifiedEvent ? !!lockedSections[`${firstModifiedEvent.extendedProps?.pnfId}-${firstModifiedEvent.extendedProps?.trayectoId}-${firstModifiedEvent.extendedProps?.seccion}-${trimestre}`] : false;

    if (conflictingEvent || isFrozen) {
      const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const isFrozenAlertText = isFrozen ? "Esta sección está CONGELADA. " : "";

      let contentMessage = "";
      if (conflictingEvent) {
        contentMessage = `El aula "${newClassroom.classroom}" ya está ocupada por "${conflictingEvent.title}" el ${dayNames[classroomChangeEvent.day]} a las ${conflictingEvent.startTime}. `
      }

      Modal.confirm({
        title: conflictingEvent ? "Aula Ocupada" : "Confirmar Reasignación",
        content: `${isFrozenAlertText}${contentMessage}¿Deseas reasignar de todos modos y recalcular el horario alrededor de este cambio ? `,
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

    // --- SELF-HEALING LOCKED SECTIONS ALGORITHM ---
    // Sincroniza el professorId de los eventos bloqueados con el profesor actual
    // asignado a la materia. Al cambiar profesor en fase 2, el horario no se mueve,
    // solo se actualiza el professorId del evento. Los conflictos (p.ej. doble
    // asignación de profesor) se detectan visualmente con borde rojo.
    const updatedLockedSections = { ...lockedSections };
    let lockedChanged = false;

    for (const [key, lockedEvents] of Object.entries(updatedLockedSections)) {
      if (!key.endsWith(`-${trimestre}`)) continue;
      let needsSync = false;

      const synchronizedEvents = lockedEvents.map((ev: any) => {
        const sub = currentSubjects?.find(s => s.innerId === ev.extendedProps?.subjectId);
        if (!sub) return ev;
        const currentProf = sub.quarter[trimestre] || null;
        if (ev.extendedProps?.professorId !== currentProf) {
          needsSync = true;
          return {
            ...ev,
            extendedProps: { ...ev.extendedProps, professorId: currentProf }
          };
        }
        return ev;
      });

      if (needsSync) {
        updatedLockedSections[key] = synchronizedEvents;
        lockedChanged = true;
      }
    }

    if (lockedChanged) {
      setTimeout(() => setLockedSections(updatedLockedSections), 0);
    }
    // ----------------------------------------------

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
      lockedEvents: Object.keys(updatedLockedSections)
        .filter(key => key.endsWith(`-${trimestre}`))
        .flatMap(key => updatedLockedSections[key]),
    });

    if (scheduleConfig?.auto_solve && localErrors.length > 0) {
      const currentAllEvents = [...loadedScheduleEvents, ...eventsdata];
      const newlySolvedEvents: Event[] = [];
      let solvedCount = 0;
      const unresolvedErrors: scheduleError[] = [];

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

      // ============================================================
      // PASS 3: SWAP DISPLACEMENT
      // Intenta liberar espacio moviendo bloques existentes (no
      // bloqueados) hacia otras posiciones válidas, para colocar las
      // materias que siguen sin asignar. Respeta restricciones de
      // profesores (días/horas) y aulas preferidas/exclusivas de los
      // bloques desplazados.
      // ============================================================
      const finalUnresolvedErrors: scheduleError[] = [];
      const swapSolvedEvents: Event[] = [];
      const swapRelocatedEvents: Event[] = [];
      const swapRemovedEventIds: Set<string> = new Set();

      if (unresolvedErrors.length > 0) {
        // Secciones bloqueadas para este trimestre
        const lockedSectionKeysTrim = new Set(
          Object.keys(updatedLockedSections).filter(k => k.endsWith(`-${trimestre}`))
        );
        const isEventInLockedSection = (ev: Event): boolean => {
          const k = `${ev.extendedProps?.pnfId}-${ev.extendedProps?.trayectoId}-${ev.extendedProps?.seccion}-${trimestre}`;
          return lockedSectionKeysTrim.has(k);
        };
        // Eventos ya cargados de BD (loadedScheduleEvents) se consideran inmóviles
        const loadedEventIds = new Set(loadedScheduleEvents.map(e => getEventId(e)));
        const isEventMovable = (ev: Event): boolean => {
          if (loadedEventIds.has(getEventId(ev))) return false;
          if (isEventInLockedSection(ev)) return false;
          return true;
        };

        type SwapBlock = {
          events: Event[];
          subjectId: string;
          pnfId: string;
          trayectoId: string;
          seccion: string;
          day: number;
          classroomId: string;
          professorId: string | null;
          turnoName: string;
          startSlotIdx: number;
          length: number;
        };

        const buildBlocksFrom = (events: Event[]): SwapBlock[] => {
          const grouped = new Map<string, Event[]>();
          for (const ev of events) {
            const p = ev.extendedProps || {};
            const key = `${ev.daysOfWeek?.[0]}|${p.subjectId}|${p.pnfId}|${p.trayectoId}|${p.seccion}|${p.classroomId}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(ev);
          }
          const result: SwapBlock[] = [];
          for (const evs of grouped.values()) {
            const turnoName = (evs[0].extendedProps?.turnName || "").toLowerCase();
            const slots = activeTurnos[turnoName];
            if (!slots) continue;
            const sorted = [...evs].sort((a, b) => a.startTime.localeCompare(b.startTime));
            let run: Event[] = [];
            const flush = () => {
              if (run.length === 0) return;
              const startIdx = slots.findIndex(s => s[0] === run[0].startTime);
              if (startIdx < 0) { run = []; return; }
              const first = run[0];
              const fp = first.extendedProps || {};
              result.push({
                events: [...run],
                subjectId: String(fp.subjectId),
                pnfId: String(fp.pnfId),
                trayectoId: String(fp.trayectoId),
                seccion: String(fp.seccion),
                day: first.daysOfWeek?.[0] ?? 0,
                classroomId: String(fp.classroomId),
                professorId: fp.professorId ? String(fp.professorId) : null,
                turnoName,
                startSlotIdx: startIdx,
                length: run.length,
              });
              run = [];
            };
            for (const ev of sorted) {
              if (run.length === 0) { run.push(ev); continue; }
              const last = run[run.length - 1];
              if (last.endTime === ev.startTime) run.push(ev);
              else { flush(); run.push(ev); }
            }
            flush();
          }
          return result;
        };

        const buildOccupancyFrom = (events: Event[]) => {
          const occ = new Map<string, { profs: Set<string>; rooms: Set<string>; secs: Set<string>; eventsAt: Event[] }>();
          for (const ev of events) {
            const day = ev.daysOfWeek?.[0];
            const start = ev.startTime;
            if (day == null || !start) continue;
            const k = `${day}-${start}`;
            let o = occ.get(k);
            if (!o) { o = { profs: new Set(), rooms: new Set(), secs: new Set(), eventsAt: [] }; occ.set(k, o); }
            const p = ev.extendedProps || {};
            if (p.professorId) o.profs.add(String(p.professorId));
            if (p.classroomId) o.rooms.add(String(p.classroomId));
            o.secs.add(`${p.pnfId}-${p.trayectoId}-${p.seccion}`);
            o.eventsAt.push(ev);
          }
          return occ;
        };

        const activeClassroomsSwap = classrooms.filter(c => c.active !== false);
        const defaultDaysSwap = scheduleConfig?.days || [1, 2, 3, 4, 5];
        const preventSingleSwap = !!scheduleConfig?.prevent_single_hour_blocks;
        const maxPerDaySwap = scheduleConfig?.conserve_slots || consecutiveConfig.maxSlots;

        // Busca una nueva ubicación para un bloque dado, respetando sus propias restricciones.
        const findRelocationForBlock = (
          block: SwapBlock,
          liveEvents: Event[],
          excludedIds: Set<string>,
          forbiddenPlacements: { day: number; startIdx: number; length: number }[] = [],
        ): { day: number; startSlotIdx: number; classroomId: string; classroomName: string } | null => {
          const blockSubject = schedulableSubjectsRef.current?.find(s => s.innerId === block.subjectId);
          if (!blockSubject) return null;
          const slots = activeTurnos[block.turnoName];
          if (!slots) return null;

          const profRes = teacherRestrictions.find(r => String(r.teacherId) === String(block.professorId));
          const profDays = profRes?.days ? defaultDaysSwap.filter(d => !new Set(profRes.days).has(d)) : defaultDaysSwap;
          const profRestrictedHours = profRes?.hours || [];

          const subKey = `${normalizeText(blockSubject.subject)}_t_${normalizeText(blockSubject.trayectoName || "")}`;
          const subPref = subjectRestriction.find(r => r.subjectKey === subKey);
          const blockCandidateRooms = (subPref?.classroomIds?.length || 0) > 0
            ? activeClassroomsSwap.filter(c => subPref!.classroomIds!.includes(c.id))
            : activeClassroomsSwap;

          const eventsForOcc = liveEvents.filter(e => !excludedIds.has(getEventId(e)));
          const occ = buildOccupancyFrom(eventsForOcc);
          const sectionKey = `${block.pnfId}-${block.trayectoId}-${block.seccion}`;

          // Horas ya asignadas de esta materia por día (en el set considerado)
          const subjectHoursPerDay = new Map<number, number>();
          for (const ev of eventsForOcc) {
            if (ev.extendedProps?.subjectId !== block.subjectId) continue;
            if (ev.extendedProps?.pnfId !== block.pnfId) continue;
            if (ev.extendedProps?.trayectoId !== block.trayectoId) continue;
            if (ev.extendedProps?.seccion !== block.seccion) continue;
            const d = ev.daysOfWeek?.[0];
            if (d == null) continue;
            subjectHoursPerDay.set(d, (subjectHoursPerDay.get(d) || 0) + 1);
          }

          for (const day of profDays) {
            const existingHours = subjectHoursPerDay.get(day) || 0;
            if (existingHours + block.length > maxPerDaySwap) continue;

            for (let startIdx = 0; startIdx <= slots.length - block.length; startIdx++) {
              // Misma posición original: saltar (no aporta nada)
              if (day === block.day && startIdx === block.startSlotIdx && String(block.classroomId) === String(block.classroomId)) {
                // permitir diferente aula en la misma posición, así que no romper aquí si no es estricto
              }

              // Evitar placements prohibidos (slots de destino del subject no asignado)
              let forbidden = false;
              for (const fp of forbiddenPlacements) {
                if (fp.day !== day) continue;
                const aStart = startIdx, aEnd = startIdx + block.length;
                const bStart = fp.startIdx, bEnd = fp.startIdx + fp.length;
                if (aStart < bEnd && bStart < aEnd) { forbidden = true; break; }
              }
              if (forbidden) continue;

              // Chequear cortes por receso
              let crossesBreak = false;
              if (scheduleConfig?.breaks?.length) {
                for (let k = 1; k < block.length; k++) {
                  const prevEnd = slots[startIdx + k - 1][1];
                  const currStart = slots[startIdx + k][0];
                  if (scheduleConfig.breaks.some((b: any) => prevEnd <= b.start && currStart >= b.end)) {
                    crossesBreak = true; break;
                  }
                }
              }
              if (crossesBreak) continue;

              // Chequear horas restringidas del profesor
              let restricted = false;
              for (let i = 0; i < block.length; i++) {
                const [slotStart] = slots[startIdx + i];
                if (profRestrictedHours.some((rh: any) => rh.day === day && rh.start === slotStart)) {
                  restricted = true; break;
                }
              }
              if (restricted) continue;

              // Profesor/sección libres
              let clash = false;
              for (let i = 0; i < block.length; i++) {
                const [slotStart] = slots[startIdx + i];
                const o = occ.get(`${day}-${slotStart}`);
                if (!o) continue;
                if (block.professorId && o.profs.has(String(block.professorId))) { clash = true; break; }
                if (o.secs.has(sectionKey)) { clash = true; break; }
              }
              if (clash) continue;

              // Aula libre
              for (const cr of blockCandidateRooms) {
                let roomOk = true;
                for (let i = 0; i < block.length; i++) {
                  const [slotStart] = slots[startIdx + i];
                  const o = occ.get(`${day}-${slotStart}`);
                  if (o?.rooms.has(String(cr.id))) { roomOk = false; break; }
                }
                if (!roomOk) continue;

                // Saltar si es exactamente la misma ubicación completa (no aporta)
                if (day === block.day && startIdx === block.startSlotIdx && String(cr.id) === String(block.classroomId)) continue;

                return { day, startSlotIdx: startIdx, classroomId: cr.id, classroomName: cr.classroom };
              }
            }
          }
          return null;
        };

        const buildRelocatedEvents = (block: SwapBlock, place: { day: number; startSlotIdx: number; classroomId: string; classroomName: string }): Event[] => {
          const slots = activeTurnos[block.turnoName];
          if (!slots) return [];
          const out: Event[] = [];
          for (let i = 0; i < block.length; i++) {
            const [s, e] = slots[place.startSlotIdx + i];
            const tpl = block.events[Math.min(i, block.events.length - 1)];
            out.push({
              ...tpl,
              daysOfWeek: [place.day],
              startTime: s,
              endTime: e,
              extendedProps: {
                ...tpl.extendedProps,
                classroomId: place.classroomId,
                classroomName: place.classroomName,
                blockId: `${place.day}-${tpl.extendedProps?.subjectId}`,
              },
            });
          }
          return out;
        };

        // Iterar sobre cada error sin resolver
        for (const errorInfo of unresolvedErrors) {
          if (!errorInfo.subjectId) { finalUnresolvedErrors.push(errorInfo); continue; }

          const subject = schedulableSubjectsRef.current?.find(s => s.innerId === errorInfo.subjectId);
          if (!subject) { finalUnresolvedErrors.push(errorInfo); continue; }

          const turnoName = subject.turnoName?.toLowerCase() || "";
          const slots = activeTurnos[turnoName];
          if (!slots?.length) { finalUnresolvedErrors.push(errorInfo); continue; }

          const professorId = errorInfo.professorId || subject.quarter[trimestre] || null;
          const sectionKey = `${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`;
          const hoursNeededTotal = errorInfo.totalHours || subject.hours[trimestre] || 0;
          if (hoursNeededTotal <= 0) { finalUnresolvedErrors.push(errorInfo); continue; }

          const profRes = teacherRestrictions.find(r => String(r.teacherId) === String(professorId));
          const targetProfDays = profRes?.days ? defaultDaysSwap.filter(d => !new Set(profRes.days).has(d)) : defaultDaysSwap;
          const targetProfRestrictedHours = profRes?.hours || [];

          const targetSubKey = `${normalizeText(subject.subject)}_t_${normalizeText(subject.trayectoName || "")}`;
          const targetSubPref = subjectRestriction.find(r => r.subjectKey === targetSubKey);
          const targetPrefClassrooms = (targetSubPref?.classroomIds?.length || 0) > 0
            ? activeClassroomsSwap.filter(c => targetSubPref!.classroomIds!.includes(c.id))
            : activeClassroomsSwap;

          let placed = 0;
          const placedEventsForSubject: Event[] = [];
          const reloLocal: { oldIds: string[]; newEvents: Event[] }[] = [];

          // Bucle: intentar colocar bloque por bloque
          let safety = 15;
          while (placed < hoursNeededTotal && safety-- > 0) {
            // Construir estado de eventos vivos (aplicando swaps ya commiteados de errores previos y de este error)
            const baseLive = currentAllEvents
              .filter(e => !swapRemovedEventIds.has(getEventId(e)))
              .concat(swapSolvedEvents, swapRelocatedEvents);
            const localRemovedIds = new Set<string>();
            for (const rl of reloLocal) for (const id of rl.oldIds) localRemovedIds.add(id);
            const localNewEvents: Event[] = [];
            for (const rl of reloLocal) localNewEvents.push(...rl.newEvents);
            const liveEvents = baseLive
              .filter(e => !localRemovedIds.has(getEventId(e)))
              .concat(localNewEvents, placedEventsForSubject);

            const movableBlocks = buildBlocksFrom(liveEvents.filter(isEventMovable));

            // Horas ya colocadas de esta materia por día en liveEvents
            const subjHoursOnDay = (day: number) => liveEvents.filter(e =>
              e.daysOfWeek?.[0] === day &&
              e.extendedProps?.subjectId === subject.innerId &&
              e.extendedProps?.pnfId === subject.pnfId &&
              e.extendedProps?.trayectoId === subject.trayectoId &&
              e.extendedProps?.seccion === subject.seccion
            ).length;

            const remaining = hoursNeededTotal - placed;
            const minBlockSize = preventSingleSwap ? 2 : 1;
            const maxBlockLen = Math.min(remaining, maxPerDaySwap);

            let madeProgress = false;

            outer:
            for (let blockLen = maxBlockLen; blockLen >= Math.min(minBlockSize, remaining); blockLen--) {
              if (blockLen > remaining) continue;
              if (preventSingleSwap && remaining - blockLen === 1) continue;

              for (const day of targetProfDays) {
                if (subjHoursOnDay(day) + blockLen > maxPerDaySwap) continue;

                for (let startIdx = 0; startIdx <= slots.length - blockLen; startIdx++) {
                  // Horas restringidas del profesor destino
                  let bad = false;
                  for (let i = 0; i < blockLen; i++) {
                    const [slotStart] = slots[startIdx + i];
                    if (targetProfRestrictedHours.some((rh: any) => rh.day === day && rh.start === slotStart)) {
                      bad = true; break;
                    }
                  }
                  if (bad) continue;

                  // Cortes por receso
                  if (scheduleConfig?.breaks?.length) {
                    for (let i = 1; i < blockLen; i++) {
                      const prevEnd = slots[startIdx + i - 1][1];
                      const currStart = slots[startIdx + i][0];
                      if (scheduleConfig.breaks.some((b: any) => prevEnd <= b.start && currStart >= b.end)) {
                        bad = true; break;
                      }
                    }
                  }
                  if (bad) continue;

                  // Para cada aula preferida del destino, recolectar bloqueadores y probar desplazarlos
                  for (const cr of targetPrefClassrooms) {
                    const occ = buildOccupancyFrom(liveEvents);
                    const blockerEvents: Event[] = [];
                    const blockerIds = new Set<string>();
                    let unmovable = false;

                    for (let i = 0; i < blockLen; i++) {
                      const [slotStart] = slots[startIdx + i];
                      const o = occ.get(`${day}-${slotStart}`);
                      if (!o) continue;
                      for (const ev of o.eventsAt) {
                        const p = ev.extendedProps || {};
                        const profConf = !!(professorId && String(p.professorId) === String(professorId));
                        const roomConf = String(p.classroomId) === String(cr.id);
                        const secConf = `${p.pnfId}-${p.trayectoId}-${p.seccion}` === sectionKey;
                        if (!profConf && !roomConf && !secConf) continue;
                        if (!isEventMovable(ev)) { unmovable = true; break; }
                        const id = getEventId(ev);
                        if (!blockerIds.has(id)) { blockerIds.add(id); blockerEvents.push(ev); }
                      }
                      if (unmovable) break;
                    }
                    if (unmovable) continue;

                    // Identificar bloques de los bloqueadores
                    const blockerBlockKeys = new Set<string>();
                    for (const ev of blockerEvents) {
                      const p = ev.extendedProps || {};
                      blockerBlockKeys.add(`${ev.daysOfWeek?.[0]}|${p.subjectId}|${p.pnfId}|${p.trayectoId}|${p.seccion}|${p.classroomId}`);
                    }
                    const blockerBlocks = movableBlocks.filter(b => {
                      const k = `${b.day}|${b.subjectId}|${b.pnfId}|${b.trayectoId}|${b.seccion}|${b.classroomId}`;
                      return blockerBlockKeys.has(k);
                    });

                    // Evitar auto-desplazar la misma materia destino (evita ciclos)
                    if (blockerBlocks.some(b => b.subjectId === subject.innerId && b.pnfId === subject.pnfId && b.trayectoId === subject.trayectoId && b.seccion === subject.seccion)) {
                      continue;
                    }

                    // Intentar relocalizar cada bloque bloqueador
                    const reloPlans: { block: SwapBlock; newPlace: { day: number; startSlotIdx: number; classroomId: string; classroomName: string } }[] = [];
                    const tempExcluded = new Set<string>();
                    for (const bk of blockerBlocks) for (const ev of bk.events) tempExcluded.add(getEventId(ev));

                    const forbidden = [{ day, startIdx, length: blockLen }];

                    let allRelocated = true;
                    for (const bk of blockerBlocks) {
                      // Simular ya-aplicados los planes previos en liveEvents
                      const simLive = liveEvents
                        .filter(e => !tempExcluded.has(getEventId(e)))
                        .concat(...reloPlans.map(rp => buildRelocatedEvents(rp.block, rp.newPlace)));
                      const newPlace = findRelocationForBlock(bk, simLive, new Set(), forbidden);
                      if (!newPlace) { allRelocated = false; break; }
                      reloPlans.push({ block: bk, newPlace });
                    }
                    if (!allRelocated) continue;

                    // ¡Éxito! Aplicar el swap local
                    const oldIds = Array.from(tempExcluded);
                    const newEventsFromPlans: Event[] = [];
                    for (const rp of reloPlans) newEventsFromPlans.push(...buildRelocatedEvents(rp.block, rp.newPlace));
                    if (oldIds.length > 0 || newEventsFromPlans.length > 0) {
                      reloLocal.push({ oldIds, newEvents: newEventsFromPlans });
                    }

                    // Agregar evento(s) de la materia destino en el slot liberado
                    for (let i = 0; i < blockLen; i++) {
                      const [s, e] = slots[startIdx + i];
                      placedEventsForSubject.push({
                        title: subject.subject,
                        daysOfWeek: [day],
                        startTime: s,
                        endTime: e,
                        extendedProps: {
                          subjectId: subject.innerId,
                          professorId: professorId || null,
                          classroomId: cr.id,
                          classroomName: cr.classroom,
                          pnfId: subject.pnfId,
                          trayectoId: subject.trayectoId,
                          trayectoName: subject.trayectoName,
                          seccion: subject.seccion,
                          pnfName: subject.pnf,
                          turnName: subject.turnoName,
                          blockId: `${day}-${subject.innerId}`,
                        },
                      });
                    }
                    placed += blockLen;
                    madeProgress = true;
                    break outer;
                  }
                }
              }
            }

            if (!madeProgress) break;
          }

          if (placed > 0) {
            // Commit global de lo logrado para esta materia
            for (const rl of reloLocal) {
              for (const id of rl.oldIds) swapRemovedEventIds.add(id);
              swapRelocatedEvents.push(...rl.newEvents);
            }
            swapSolvedEvents.push(...placedEventsForSubject);

            if (placed < hoursNeededTotal) {
              finalUnresolvedErrors.push({
                ...errorInfo,
                totalHours: hoursNeededTotal - placed,
                description: `${errorInfo.description || ''} (Intercambio liberó ${placed}h)`.trim(),
              });
            }
          } else {
            finalUnresolvedErrors.push(errorInfo);
          }
        }
      } else {
        // No había errores sin resolver después de pass 1/2
      }

      // Aplicar cambios a eventsdata: quitar removidos, sumar relocalizados y solucionados por swap
      if (swapSolvedEvents.length > 0 || swapRelocatedEvents.length > 0 || swapRemovedEventIds.size > 0) {
        const filteredEventsData = eventsdata.filter(e => !swapRemovedEventIds.has(getEventId(e)));
        eventsdata.length = 0;
        eventsdata.push(...filteredEventsData);
      }
      eventsdata.push(...newlySolvedEvents);
      // Los swap aportan relocated + solved (los solved son las materias objetivo; relocated son los bloqueadores reubicados)
      eventsdata.push(...swapRelocatedEvents, ...swapSolvedEvents);

      const effectiveUnresolved = unresolvedErrors.length > 0 ? finalUnresolvedErrors : unresolvedErrors;
      setErrors(effectiveUnresolved);

      setTimeout(() => {
        if (solvedCount > 0 || newlySolvedEvents.length > 0 || swapSolvedEvents.length > 0) {
          if (effectiveUnresolved.length > 0) {
            const swapMsg = swapSolvedEvents.length > 0 ? ` (Intercambio resolvió ${swapSolvedEvents.length} horas adicionales)` : '';
            message.warning(`Auto-solución: Se solucionaron algunos problemas, pero todavía quedan ${effectiveUnresolved.length} conflictos.${swapMsg}`);
          } else if (swapSolvedEvents.length > 0) {
            message.success(`Auto-solución: Intercambio resolvió ${swapSolvedEvents.length} hora(s) adicional(es) reubicando bloques.`);
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

      // Filtrar eventos generados con los mismos criterios (solo schedule events)
      filteredGenerated = getScheduleEvents(eventData).filter(
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
      filteredGenerated = getScheduleEvents(eventData).filter(
        (event) => !!event.extendedProps.professorId && targetTeacherIds.has(String(event.extendedProps.professorId))
      );
    } else if (viewMode === "classroom") {
      // Mostrar todas las materias asignadas a algún aula
      filteredLoaded = loadedScheduleEvents.filter((event) => !!event.extendedProps?.classroomId);
      filteredGenerated = getScheduleEvents(eventData).filter((event) => !!event.extendedProps?.classroomId);
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

  const handleDrop = (targetRowIndex: number, targetDay: number, targetEntityId?: string) => {
    if (!draggedEventInfo || !tableSlots[targetRowIndex]) return;

    const { sourceDay, sourceStartTime, rowSpan, title, classroomId, seccion, pnfName } = draggedEventInfo;
    const targetStartTime = tableSlots[targetRowIndex][0];

    const sourceStartIdx = tableSlots.findIndex(s => s[0] === sourceStartTime);

    const allEvents = [...loadedScheduleEvents, ...getScheduleEvents(eventData)];

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

    const firstMovingEvent = movingEvents[0];
    const isFrozen = !!lockedSections[`${firstMovingEvent.extendedProps?.pnfId}-${firstMovingEvent.extendedProps?.trayectoId}-${firstMovingEvent.extendedProps?.seccion}-${trimestre}`];

    const targetSlots = tableSlots.slice(targetRowIndex, targetRowIndex + rowSpan);
    const targetSlotStarts = targetSlots.map(s => s[0]);

    // Si estamos en la vista de profesor y el targetEntityId es diferente, estamos reasignando
    const originalProfId = firstMovingEvent.extendedProps.professorId;
    const isReassigningProfessor = viewMode === "professor" && targetEntityId && targetEntityId !== originalProfId;
    const profId = isReassigningProfessor ? targetEntityId : originalProfId;

    // If reassigning professor, we allow same day/time drops. Otherwise, we block drops on the same exact coordinate.
    const isSameSpot = sourceDay === targetDay && sourceStartTime === targetStartTime;

    if ((isSameSpot && !isReassigningProfessor) || targetRowIndex + rowSpan > tableSlots.length) {
      setDraggedEventInfo(null);
      return;
    }

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

      if (isReassigningProfessor && profId) {
        const resp = addSubjectToTeacher({ subjectId: firstMovingEvent.extendedProps?.subjectId as string, teacherId: profId });
        if (!resp.error && resp.data) {
          handleSubjectChange(resp.data);
        }
      } else {
        setGenerationCounter(prev => prev + 1);
      }
    };

    const frozenKey = `${firstMovingEvent.extendedProps?.pnfId}-${firstMovingEvent.extendedProps?.trayectoId}-${firstMovingEvent.extendedProps?.seccion}-${trimestre}`;

    if (isFrozen && !conflictFound) {
      // 1. Actualizar "lockedSections" para parchear el cambio en caliente sin desordenar
      setLockedSections(prev => {
        const newObj = { ...prev };
        if (newObj[frozenKey]) {
          const patchedEvents = newObj[frozenKey].map(e => {
            const isMoving = e.extendedProps?.subjectId === firstMovingEvent.extendedProps?.subjectId &&
              e.daysOfWeek.includes(sourceDay) &&
              sourceSlotStarts.includes(e.startTime);

            if (isMoving) {
              const diffIndex = sourceSlotStarts.indexOf(e.startTime);
              const newStartTime = targetSlotStarts[diffIndex];
              const newEndTime = targetSlots[diffIndex][1];
              return {
                ...e,
                daysOfWeek: [targetDay],
                startTime: newStartTime,
                endTime: newEndTime,
                extendedProps: { ...e.extendedProps, professorId: profId, classroomId: classroomId }
              };
            }
            return e;
          });
          newObj[frozenKey] = patchedEvents;
        }
        return newObj;
      });

      // 2. Si reasignó profesor, actualizar en backend
      if (isReassigningProfessor && profId) {
        const resp = addSubjectToTeacher({ subjectId: firstMovingEvent.extendedProps?.subjectId as string, teacherId: profId });
        if (!resp.error && resp.data) {
          handleSubjectChange(resp.data);
        }
      }

      const pnfIdStr = firstMovingEvent.extendedProps?.pnfId;
      const trayIdStr = firstMovingEvent.extendedProps?.trayectoId;
      const secStr = firstMovingEvent.extendedProps?.seccion;

      if (pnfIdStr && trayIdStr && secStr) {
        setHasUnsavedOverrides(true);
        // Force the section to temporarily "unfreeze" and "refreeze" to force an update logic for React state while saving
        setLockedSections(prev => {
          const newObj = { ...prev };
          delete newObj[frozenKey];
          return newObj;
        });

        setTimeout(() => {
          setLockedSections(prev => {
            const newObj = { ...prev };
            newObj[frozenKey] = eventData.filter(e =>
              e.extendedProps.pnfId === pnfIdStr &&
              e.extendedProps.trayectoId === trayIdStr &&
              e.extendedProps.seccion === secStr
            );
            return newObj;
          });
        }, 100);
      }

      setDraggedEventInfo(null);
      return; // Completado silenciosamente sin lanzar recálculo masivo
    }

    if (isFrozen && conflictFound) {
      Modal.confirm({
        title: "Reasignación con Conflictos",
        content: `Esta sección está CONGELADA, pero la nueva asignación genera conflictos. ¿Deseas descongelar SOLAMENTE esta sección y reordenarla para reparar el conflicto? (El resto del horario se mantendrá intacto)`,
        okText: "Sí, descongelar y reparar sección",
        cancelText: "Deshacer cambio",
        okButtonProps: { danger: true },
        onOk: () => {
          setLockedSections(prev => {
            const newObj = { ...prev };
            delete newObj[frozenKey];
            return newObj;
          });
          pinDraggedEventsAndRecalculate();
          setDraggedEventInfo(null);
        },
        onCancel: () => setDraggedEventInfo(null)
      });
      return;
    }

    if (conflictFound) {
      Modal.confirm({
        title: "Confirmar Cambios",
        content: `La posición tiene conflictos o restricciones ocupadas. ¿Deseas aplicar el cambio de todos modos y forzar la posición (recalcular el horario)?`,
        okText: "Sí, forzar y recalcular",
        cancelText: "Deshacer",
        okButtonProps: { danger: true },
        onOk: () => {
          pinDraggedEventsAndRecalculate();
          setDraggedEventInfo(null);
        },
        onCancel: () => setDraggedEventInfo(null)
      });
      return;
    }
    // Si no hay conflicto, igual lo anclamos para que soporte futuros recálculos sin perderse
    pinDraggedEventsAndRecalculate();
    setDraggedEventInfo(null);
  };

  const handleViewModeChange = (mode: "pnf" | "professor" | "classroom") => {
    setViewMode(mode);
    if (mode !== "pnf") {
      setIsOfficialStageMode(false);
    }
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
                  {(() => {
                    const filteredSections = Array.from(
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
                    ).sort();

                    if (filteredSections.length === 0) {
                      return (
                        <Badge
                          status="warning"
                          text={<span style={{ color: "#faad14" }}>Sin sección</span>}
                        />
                      );
                    }

                    return (
                      <Radio.Group
                        size="small"
                        value={seccion}
                        onChange={(e) => setSeccion(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        options={filteredSections.map((sec) => ({
                          value: sec,
                          label: sec,
                        }))}
                      />
                    );
                  })()}
                </div>

                <div className="schedule-select">
                  <span>PNF:</span>
                  <Select
                    size="small"
                    value={pnf}
                    style={{ width: 250 }}
                    onChange={(newPnf) => {
                      setPnf(newPnf);
                      const turnsWithSections = Object.keys(activeTurnos).filter((t) =>
                        (subjects || []).some(
                          (s) =>
                            s.pnfId === newPnf &&
                            s.turnoName?.toLowerCase() === t &&
                            (!trayectoId || s.trayectoId === trayectoId)
                        )
                      );
                      const newTurn = turnsWithSections.length > 0 ? turnsWithSections[0] : undefined;
                      setTurn(newTurn || "");
                      
                      const availableSections = Array.from(
                        new Set(
                          (subjects || [])
                            .filter(
                              (s) =>
                                s.pnfId === newPnf &&
                                (!newTurn || s.turnoName?.toLowerCase() === newTurn) &&
                                (!trayectoId || s.trayectoId === trayectoId)
                            )
                            .map((s) => s.seccion)
                        )
                      ).sort();

                      if (availableSections.length > 0) {
                        setSeccion(availableSections[0]);
                      }
                    }}
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
                    onChange={(newTrayectoId) => {
                      setTrayectoId(newTrayectoId);
                      const availableSections = Array.from(
                        new Set(
                          (subjects || [])
                            .filter(
                              (s) =>
                                (!pnf || s.pnfId === pnf) &&
                                s.trayectoId === newTrayectoId &&
                                (!turn || s.turnoName?.toLowerCase() === turn)
                            )
                            .map((s) => s.seccion)
                        )
                      ).sort();

                      if (availableSections.length > 0) {
                        setSeccion(availableSections[0]);
                      }
                    }}
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
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }} onClick={() => { setFrozenModalTab(trimestre); setIsFrozenManagerOpen(true); }}>
                  <GiFrozenBlock className={styles.icon} style={{ color: Object.keys(lockedSections).some(k => k.endsWith(`-${trimestre}`)) ? "#1890ff" : undefined }} />
                  {Object.keys(lockedSections).some(k => k.endsWith(`-${trimestre}`)) && (
                    <Badge count={Object.keys(lockedSections).filter(k => k.endsWith(`-${trimestre}`)).length} style={{ backgroundColor: "#1890ff", position: "absolute", top: "-5px", right: "-8px", transform: "scale(0.8)" }} />
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

        <div
          className="schedule-content-wrapper"
          style={{
            position: "relative",
            marginRight: isOfficialStageMode ? `${STAGING_PANEL_WIDTH}px` : "0",
            transition: "margin-right 0.2s ease"
          }}
        >
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
          <div
            id="professor-scroll-container"
            className={`calendar - container view - ${viewMode} `}
            style={{ padding: "0", overflowY: "auto", overflowX: "auto" }}
          >
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
                      boxShadow: lockedSections[`${pnf}-${trayectoId}-${seccion}-${trimestre}`] && !title ? "0 0 15px rgba(0, 191, 255, 0.4)" : "none",
                      border: lockedSections[`${pnf}-${trayectoId}-${seccion}-${trimestre}`] && !title ? "3px solid rgba(0, 191, 255, 0.6)" : "1px solid #dee2e6",
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

                                  const isFrozen = !!lockedSections[`${cell.extendedProps?.pnfId}-${cell.extendedProps?.trayectoId}-${cell.extendedProps?.seccion}-${trimestre}`];

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
                                      disabled: isFrozen && !isOfficialStageMode,
                                      label: (isFrozen && !isOfficialStageMode) ? "Aula Congelada (No editable)" : "Cambiar Aula",
                                      onClick: () => {
                                        if (isFrozen && !isOfficialStageMode) return;
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

                                  // Check if this cell has conflicts
                                  const cellEventId = `${cell.extendedProps?.subjectId}-${cell.extendedProps?.seccion}-${day}-${slot[0]}`;
                                  const baseCellConflicts = eventsWithConflicts[cellEventId] || [];
                                  const profMismatch = professorMismatchConflicts.get(cellEventId) || [];
                                  const cellConflicts = [...baseCellConflicts, ...profMismatch];
                                  const hasConflict = cellConflicts.length > 0;

                                  return (
                                    <td
                                      className="schedule-time-cell"
                                      key={day}
                                      rowSpan={cell.rowSpan}
                                      draggable={!isFrozen || isOfficialStageMode}
                                      onDragStart={(e) => {
                                        if (isFrozen && !isOfficialStageMode) {
                                          e.preventDefault();
                                          return;
                                        }
                                        e.dataTransfer.effectAllowed = "move";
                                        // Store full event data for official stage mode
                                        if (isOfficialStageMode && cell.extendedProps) {
                                          // Find the real event in eventData instead of creating an artificial one
                                          const realEvent = getScheduleEvents(eventData).find(ev =>
                                            ev.daysOfWeek?.[0] === day &&
                                            ev.startTime === slot[0] &&
                                            ev.extendedProps?.subjectId === cell.extendedProps?.subjectId &&
                                            ev.extendedProps?.seccion === cell.extendedProps?.seccion
                                          );
                                          if (realEvent) {
                                            e.dataTransfer.setData("text/plain", JSON.stringify(realEvent));
                                            e.dataTransfer.setData("application/schedule-event", "true");
                                          } else {
                                            e.dataTransfer.setData("text/plain", cell.title || "");
                                          }
                                        } else {
                                          e.dataTransfer.setData("text/plain", cell.title || "");
                                        }
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
                                      onDragEnd={() => { setDraggedEventInfo(null); setDropPreview(null); }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        // Update drop preview for visual indicator
                                        const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
                                        const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
                                        const isUnassignedBlock = e.dataTransfer.types.includes("application/unassigned-block");
                                        const isUnassignedEvent = e.dataTransfer.types.includes("application/unassigned-event");
                                        if (isStagedEvent || isScheduleEvent || isUnassignedBlock || isUnassignedEvent) {
                                          setDropPreview({ day, startTime: slot[0] });
                                        }
                                      }}
                                      onDragLeave={(e) => {
                                        // Clear drop preview when leaving the cell
                                        const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
                                        const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
                                        const isUnassignedBlock = e.dataTransfer.types.includes("application/unassigned-block");
                                        const isUnassignedEvent = e.dataTransfer.types.includes("application/unassigned-event");
                                        if (isStagedEvent || isScheduleEvent || isUnassignedBlock || isUnassignedEvent) {
                                          setDropPreview(null);
                                        }
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        setDropPreview(null); // Clear preview on drop
                                        // Handle drop from staging area
                                        const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
                                        const isUnassignedBlock = e.dataTransfer.types.includes("application/unassigned-block");
                                        const isUnassignedEvent = e.dataTransfer.types.includes("application/unassigned-event");
                                        if (isUnassignedBlock || isUnassignedEvent) {
                                          // Handle unassigned subject drop
                                          const eventDataStr = e.dataTransfer.getData("text/plain");
                                          const isBlockDrag = e.dataTransfer.types.includes("application/unassigned-block");
                                          try {
                                            const parsedData = JSON.parse(eventDataStr);
                                            const eventsFromDrop = Array.isArray(parsedData) ? parsedData as Event[] : [parsedData as Event];
                                            handleDropUnassignedEvents(day, slot[0], eventsFromDrop, isBlockDrag);
                                          } catch {
                                            console.error("Error parsing unassigned event data");
                                          }
                                          return;
                                        }
                                        if (isStagedEvent) {
                                          const targetCellEvent: Event = {
                                            title: cell.title,
                                            daysOfWeek: [day],
                                            startTime: slot[0],
                                            endTime: tableSlots[rowIndex + cell.rowSpan - 1]?.[1] || slot[1],
                                            extendedProps: cell.extendedProps
                                          };
                                          const eventDataStr = e.dataTransfer.getData("text/plain");
                                          const isBlockDrag = e.dataTransfer.types.includes("application/staged-block");
                                          try {
                                            const parsedData = JSON.parse(eventDataStr);
                                            const eventFromDrop = Array.isArray(parsedData) ? parsedData as Event[] : parsedData as Event;
                                            handleDropFromStaging(day, slot[0], slot[1], eventFromDrop, targetCellEvent, isBlockDrag);
                                          } catch {
                                            if (draggingFromStaging) {
                                              handleDropFromStaging(day, slot[0], slot[1], draggingFromStaging, targetCellEvent, false);
                                            }
                                          }
                                          return;
                                        }
                                        // Handle drop from another schedule cell (official stage mode)
                                        const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
                                        if (isScheduleEvent && isOfficialStageMode) {
                                          const eventDataStr = e.dataTransfer.getData("text/plain");
                                          try {
                                            const sourceEvent = JSON.parse(eventDataStr) as Event;
                                            const targetEndTime = tableSlots[rowIndex + cell.rowSpan - 1]?.[1] || slot[1];
                                            handleDropBetweenCells(day, slot[0], targetEndTime, sourceEvent);
                                          } catch {
                                            // Ignore parse errors
                                          }
                                          return;
                                        }
                                        // Normal drop handling
                                        handleDrop(rowIndex, day, entityId);
                                      }}
                                      style={(() => {
                                        const isDropTarget = dropPreview?.day === day && dropPreview?.startTime === slot[0];
                                        return {
                                          borderTop: isDropTarget ? "2px dashed #722ed1" : hasConflict ? "2px solid #ff4d4f" : (isOfficialStageMode ? "2px dashed #722ed1" : "1px solid #dee2e6"),
                                          borderRight: isDropTarget ? "2px dashed #722ed1" : hasConflict ? "2px solid #ff4d4f" : (isOfficialStageMode ? "2px dashed #722ed1" : "1px solid #dee2e6"),
                                          borderBottom: isDropTarget ? "2px dashed #722ed1" : hasConflict ? "2px solid #ff4d4f" : (isOfficialStageMode ? "2px dashed #722ed1" : "1px solid #dee2e6"),
                                          borderLeft: isDropTarget ? "4px dashed #722ed1" : hasConflict ? "4px solid #ff4d4f" : `4px solid ${baseColor}`,
                                          padding: "6px",
                                          verticalAlign: "top" as const,
                                          backgroundColor: isDropTarget ? "#f9f0ff" : hasConflict ? "#fff2f0" : (isOfficialStageMode ? `${bgColor}` : bgColor),
                                          height: "100%",
                                          cursor: isOfficialStageMode ? "grab" : (isFrozen ? "default" : "grab"),
                                          opacity: draggedEventInfo?.title === cell.title && draggedEventInfo?.sourceDay === day && draggedEventInfo?.sourceStartTime === slot[0] ? 0.3 : 1,
                                          transition: "background-color 0.2s ease, opacity 0.2s ease, border 0.2s ease",
                                          position: "relative" as const,
                                        };
                                      })()}
                                    >
                                      {/* Conflict indicator button */}
                                      {hasConflict && (
                                        <Tooltip 
                                          title={
                                            <div>
                                              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>⚠️ Conflictos detectados:</div>
                                              {cellConflicts.map((c, i) => (
                                                <div key={i} style={{ marginBottom: 2 }}>• {c}</div>
                                              ))}
                                            </div>
                                          }
                                          placement="left"
                                        >
                                          <div
                                            style={{
                                              position: "absolute",
                                              bottom: 4,
                                              right: 4,
                                              width: 18,
                                              height: 18,
                                              borderRadius: "50%",
                                              backgroundColor: "#ff4d4f",
                                              color: "#fff",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: "11px",
                                              fontWeight: "bold",
                                              cursor: "pointer",
                                              zIndex: 10,
                                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              Modal.warning({
                                                title: "Conflictos en este horario",
                                                content: (
                                                  <div>
                                                    <p><strong>{cell.title}</strong></p>
                                                    <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                                                      {cellConflicts.map((c, i) => (
                                                        <li key={i} style={{ marginBottom: 4 }}>{c}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                ),
                                                okText: "Entendido"
                                              });
                                            }}
                                          >
                                            !
                                          </div>
                                        </Tooltip>
                                      )}
                                      <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
                                        <Tooltip title={isOfficialStageMode ? "Arrastra para mover (Click derecho para opciones)" : tooltipContent}>
                                          <div 
                                            style={{ 
                                              display: "flex", 
                                              flexDirection: "column", 
                                              gap: "2px", 
                                              height: "100%", 
                                              cursor: isOfficialStageMode ? "grab" : "context-menu"
                                            }}
                                          >
                                            <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#212529", lineHeight: "1.2", marginBottom: "4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                              <span>{cell.title}</span>
                                              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                                {overrideKeys.has(`${cell.title}|${day}|${slot[0]}`) && (
                                                  <TbPinFilled style={{ color: "#1890ff", fontSize: "0.8rem", flexShrink: 0 }} title="Aula fijada manualmente" />
                                                )}
                                                {isOfficialStageMode && (
                                                  <Tooltip title="Enviar al depósito">
                                                    <div
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (cell.extendedProps) {
                                                          // Find the real event in eventData instead of creating an artificial one
                                                          const realEvent = getScheduleEvents(eventData).find(ev =>
                                                            ev.daysOfWeek?.[0] === day &&
                                                            ev.startTime === slot[0] &&
                                                            ev.extendedProps?.subjectId === cell.extendedProps?.subjectId &&
                                                            ev.extendedProps?.seccion === cell.extendedProps?.seccion
                                                          );
                                                          if (realEvent) {
                                                            moveEventToStaging(realEvent);
                                                          } else {
                                                            message.warning("No se encontró el evento en el horario");
                                                          }
                                                        }
                                                      }}
                                                      style={{
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: "4px",
                                                        backgroundColor: "#722ed1",
                                                        color: "#fff",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "10px",
                                                        cursor: "pointer",
                                                        flexShrink: 0,
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                                                      }}
                                                    >
                                                      📦
                                                    </div>
                                                  </Tooltip>
                                                )}
                                              </div>
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
                                  const isGridFrozen = viewMode === "pnf" && !!lockedSections[`${pnf}-${trayectoId}-${seccion}-${trimestre}`];
                                  const showDropIndicator = dropPreview?.day === day && dropPreview?.startTime === slot[0];
                                  return (
                                    <td key={day}
                                      style={{
                                        border: showDropIndicator ? "2px dashed #722ed1" : "1px solid #dee2e6",
                                        backgroundColor: showDropIndicator ? "#f9f0ff" : undefined,
                                        transition: "all 0.2s ease"
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        // Update drop preview for visual indicator
                                        const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
                                        const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
                                        const isUnassignedBlock = e.dataTransfer.types.includes("application/unassigned-block");
                                        const isUnassignedEvent = e.dataTransfer.types.includes("application/unassigned-event");
                                        if (isStagedEvent || isScheduleEvent || isUnassignedBlock || isUnassignedEvent) {
                                          setDropPreview({ day, startTime: slot[0] });
                                        }
                                      }}
                                      onDragLeave={(e) => {
                                        // Clear drop preview when leaving the cell
                                        const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
                                        const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
                                        const isUnassignedBlock = e.dataTransfer.types.includes("application/unassigned-block");
                                        const isUnassignedEvent = e.dataTransfer.types.includes("application/unassigned-event");
                                        if (isStagedEvent || isScheduleEvent || isUnassignedBlock || isUnassignedEvent) {
                                          setDropPreview(null);
                                        }
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        setDropPreview(null); // Clear preview on drop

                                        // Check if dropping from staging area
                                        const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
                                        const isUnassignedBlock = e.dataTransfer.types.includes("application/unassigned-block");
                                        const isUnassignedEvent = e.dataTransfer.types.includes("application/unassigned-event");
                                        if (isUnassignedBlock || isUnassignedEvent) {
                                          // Handle unassigned subject drop
                                          const eventDataStr = e.dataTransfer.getData("text/plain");
                                          const isBlockDrag = e.dataTransfer.types.includes("application/unassigned-block");
                                          try {
                                            const parsedData = JSON.parse(eventDataStr);
                                            const eventsFromDrop = Array.isArray(parsedData) ? parsedData as Event[] : [parsedData as Event];
                                            handleDropUnassignedEvents(day, slot[0], eventsFromDrop, isBlockDrag);
                                          } catch {
                                            console.error("Error parsing unassigned event data");
                                          }
                                          return;
                                        }
                                        if (isStagedEvent) {
                                          // Get event data from dataTransfer
                                          const eventDataStr = e.dataTransfer.getData("text/plain");
                                          const isBlockDrag = e.dataTransfer.types.includes("application/staged-block");
                                          try {
                                            const parsedData = JSON.parse(eventDataStr);
                                            const eventFromDrop = Array.isArray(parsedData) ? parsedData as Event[] : parsedData as Event;
                                            handleDropFromStaging(day, slot[0], slot[1], eventFromDrop, undefined, isBlockDrag);
                                          } catch {
                                            // Fallback to draggingFromStaging state
                                            if (draggingFromStaging) {
                                              handleDropFromStaging(day, slot[0], slot[1], draggingFromStaging, undefined, false);
                                            }
                                          }
                                          return;
                                        }

                                        // Check if dropping from another schedule cell (official stage mode)
                                        const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
                                        if (isScheduleEvent && isOfficialStageMode) {
                                          const eventDataStr = e.dataTransfer.getData("text/plain");
                                          try {
                                            const sourceEvent = JSON.parse(eventDataStr) as Event;
                                            handleDropBetweenCells(day, slot[0], slot[1], sourceEvent);
                                          } catch {
                                            // Ignore parse errors
                                          }
                                          return;
                                        }
                                        
                                        // Even if dropping on an empty slot, if the grid is frozen, we might want to warn
                                        // But wait, if someone is dragging *into* a frozen grid, we should warn them
                                        if (isGridFrozen) {
                                          Modal.confirm({
                                            title: "Confirmar Cambios en Grilla Congelada",
                                            content: `Estás a punto de reasignar una materia hacia una grilla que actualmente se encuentra congelada para este trimestre. ¿Estás seguro de forzar el cambio?`,
                                            okText: "Sí, forzar",
                                            cancelText: "Deshacer",
                                            okButtonProps: { danger: true },
                                            onOk: () => {
                                              handleDrop(rowIndex, day, entityId);
                                            }
                                          });
                                          return;
                                        }
                                        handleDrop(rowIndex, day, entityId);
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
                  const currentSectionKey = `${pnf}-${trayectoId}-${seccion}-${trimestre}`;
                  const isFrozen = !!lockedSections[currentSectionKey];
                  return (
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", marginTop: "10px", paddingRight: "10px", gap: "8px" }}>
                        {isFrozen && (
                          <Tooltip title={isOfficialStageMode ? "Cerrar Área de Depósito" : "Abrir Área de Depósito"}>
                            <Button
                              type={isOfficialStageMode ? "primary" : "default"}
                              icon={<span style={{ fontSize: "14px" }}>📦</span>}
                              onClick={() => setIsOfficialStageMode(!isOfficialStageMode)}
                              style={{
                                boxShadow: isOfficialStageMode ? "0 0 8px rgba(114, 46, 209, 0.4)" : "0 0 8px rgba(114, 46, 209, 0.2)",
                                borderColor: isOfficialStageMode ? "#722ed1" : "#d3adf7",
                                color: isOfficialStageMode ? "#fff" : "#722ed1",
                                backgroundColor: isOfficialStageMode ? "#722ed1" : undefined
                              }}
                            >
                              Depósito{getStagingEvents(eventData).length > 0 ? ` (${getStagingEvents(eventData).length})` : ""}
                            </Button>
                          </Tooltip>
                        )}
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

      {/* Modal for selecting classroom for unassigned subjects */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SwapOutlined style={{ color: "#1890ff" }} />
            <span>Seleccionar Aula</span>
          </div>
        }
        open={!!unassignedDropData}
        onOk={handleUnassignedClassroomConfirm}
        onCancel={() => {
          setUnassignedDropData(null);
          setNewClassroomId("");
        }}
        okText="Agregar"
        cancelText="Cancelar"
        okButtonProps={{ disabled: !newClassroomId }}
      >
        {unassignedDropData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              backgroundColor: "#fff7e6",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ffd591",
            }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
                {schedulableSubjectsRef.current?.find(s => s.innerId === unassignedDropData.subjectId)?.subject || 'Materia'}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#595959" }}>
                {["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][unassignedDropData.targetDay]} • {unassignedDropData.targetStartTime} ({unassignedDropData.eventsToDrop.length} hora(s))
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>
                Seleccionar aula:
              </label>
              <Select
                style={{ width: "100%" }}
                value={newClassroomId || undefined}
                placeholder="Seleccione un aula"
                onChange={(value) => setNewClassroomId(value)}
                showSearch
                optionFilterProp="title"
                options={classrooms.map(c => {
                  // Check if classroom is occupied during the target time slots
                  let isOccupied = false;
                  if (unassignedDropData) {
                    const allEventsForConflict = [...loadedScheduleEvents, ...(eventData || [])];
                    const slotIndex = tableSlots.findIndex(s => s[0] === unassignedDropData.targetStartTime);
                    
                    for (let i = 0; i < unassignedDropData.eventsToDrop.length; i++) {
                      const currentSlotIndex = slotIndex + i;
                      if (currentSlotIndex >= tableSlots.length) break;
                      
                      const slot = tableSlots[currentSlotIndex];
                      isOccupied = allEventsForConflict.some((evt) => {
                        const sameDay = evt.daysOfWeek?.includes(unassignedDropData.targetDay);
                        const usesTargetClassroom = evt.extendedProps?.classroomId === c.id;
                        const overlapsTime = evt.startTime >= slot[0] && evt.startTime < slot[1];
                        return sameDay && usesTargetClassroom && overlapsTime;
                      });
                      
                      if (isOccupied) break; // If any slot is occupied, mark as occupied
                    }
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
        onCancel={() => { setIsFrozenManagerOpen(false); setFrozenPnfFilter([]); }}
        footer={[
          <Button key="close" onClick={() => { setIsFrozenManagerOpen(false); setFrozenPnfFilter([]); }}>Cerrar</Button>
        ]}
        width={700}
      >
        <div style={{ marginBottom: "15px", padding: "0 10px" }}>
          <div style={{ marginBottom: "15px" }}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Filtrar por PNF(s)..."
              value={frozenPnfFilter}
              onChange={(values) => setFrozenPnfFilter(values)}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount="responsive"
              options={Array.from(new Set(subjects?.map(s => s.pnfId).filter(Boolean))).map(pnfId => {
                const pnfName = subjects?.find(s => s.pnfId === pnfId)?.pnf || pnfId;
                return { label: pnfName, value: pnfId };
              }).sort((a, b) => (a.label as string).localeCompare(b.label as string))}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <Button
              type={frozenModalTab === "q1" ? "primary" : "default"}
              onClick={() => setFrozenModalTab("q1")}
            >
              Trimestre 1
            </Button>
            <Button
              type={frozenModalTab === "q2" ? "primary" : "default"}
              onClick={() => setFrozenModalTab("q2")}
            >
              Trimestre 2
            </Button>
            <Button
              type={frozenModalTab === "q3" ? "primary" : "default"}
              onClick={() => setFrozenModalTab("q3")}
            >
              Trimestre 3
            </Button>
          </div>
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "10px" }}>
          {Array.from(new Set(subjects?.map(s => s.pnfId).filter(Boolean))).map(pnfId => {
            const pnfName = subjects?.find(s => s.pnfId === pnfId)?.pnf || pnfId;

            // Apply filter
            if (frozenPnfFilter.length > 0 && !frozenPnfFilter.includes(pnfId as string)) {
              return null;
            }

            const allTrayectosRaw = Array.from(new Set(subjects?.filter(s => s.pnfId === pnfId).map(s => s.trayectoId).filter(Boolean)));
            const trayectosInPnf = allTrayectosRaw.sort((a, b) => {
              const nameA = (trayectosList?.find(t => t.id === a)?.name || a).toString().toUpperCase();
              const nameB = (trayectosList?.find(t => t.id === b)?.name || b).toString().toUpperCase();

              // Definir prioridades para el ordenamiento
              const getPriority = (name: string) => {
                if (name.includes("INICIAL")) return 0;
                if (name.includes(" TRAYECTO I") || name.endsWith(" I")) return 1;
                if (name.includes(" TRAYECTO II") || name.endsWith(" II")) return 2;
                if (name.includes(" TRAYECTO III") || name.endsWith(" III")) return 3;
                if (name.includes(" TRAYECTO IV") || name.endsWith(" IV")) return 4;
                return 10; // Otros
              };

              const priorityA = getPriority(nameA);
              const priorityB = getPriority(nameB);

              if (priorityA !== priorityB) {
                return priorityA - priorityB;
              }

              return nameA.localeCompare(nameB);
            });
            if (!trayectosInPnf.length) return null;

            const allPnfSections = trayectosInPnf.flatMap(trayId => {
              return Array.from(new Set(subjects?.filter(s => s.pnfId === pnfId && s.trayectoId === trayId).map(s => s.seccion).filter(Boolean)))
                .map(sec => ({ trayId, sec }));
            });
            const frozenInPnfCount = allPnfSections.filter(({ trayId, sec }) => !!lockedSections[`${pnfId}-${trayId}-${sec}-${frozenModalTab}`]).length;
            const isPnfAllFrozen = frozenInPnfCount === allPnfSections.length && allPnfSections.length > 0;
            const isPnfIndeterminate = frozenInPnfCount > 0 && frozenInPnfCount < allPnfSections.length;

            return (
              <div key={pnfId} style={{ marginBottom: "20px", border: "1px solid #f0f0f0", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#fafafa", padding: "10px 15px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold" }}>{pnfName}</span>
                  <Checkbox
                    indeterminate={isPnfIndeterminate}
                    checked={isPnfAllFrozen}
                    onChange={() => toggleFreezePnf(pnfId as string, pnfName as string, allPnfSections as { trayId: string, sec: string }[], isPnfAllFrozen, frozenModalTab)}
                  >
                    Congelar PNF Completo
                  </Checkbox>
                </div>
                <div style={{ padding: "10px" }}>
                  {trayectosInPnf.map(trayId => {
                    const trayName = trayectosList?.find(t => t.id === trayId)?.name || trayId;
                    const sectionsInTray = Array.from(new Set(subjects?.filter(s => s.pnfId === pnfId && s.trayectoId === trayId).map(s => s.seccion).filter(Boolean))).sort(new Intl.Collator('es', { numeric: true }).compare);
                    if (!sectionsInTray.length) return null;

                    const frozenInTrayCount = sectionsInTray.filter(sec => !!lockedSections[`${pnfId}-${trayId}-${sec}-${frozenModalTab}`]).length;
                    const isTrayAllFrozen = frozenInTrayCount === sectionsInTray.length && sectionsInTray.length > 0;
                    const isTrayIndeterminate = frozenInTrayCount > 0 && frozenInTrayCount < sectionsInTray.length;

                    return (
                      <div key={trayId} style={{ marginBottom: "15px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ fontSize: "0.9rem", color: "#666" }}>{trayName}</div>
                          <Checkbox
                            indeterminate={isTrayIndeterminate}
                            checked={isTrayAllFrozen}
                            onChange={() => toggleFreezeTrayecto(pnfId as string, trayId as string, trayName as string, sectionsInTray as string[], isTrayAllFrozen, frozenModalTab)}
                          >
                            Congelar Trayecto
                          </Checkbox>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                          {sectionsInTray.map(sec => {
                            const isFrozen = !!lockedSections[`${pnfId}-${trayId}-${sec}-${frozenModalTab}`];
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
                                onClick={() => toggleFreezeSection(pnfId as string, trayId as string, sec as string, frozenModalTab)}
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
      
      <LockedSectionsStageManager 
        open={isStageManagerOpen}
        onClose={() => setIsStageManagerOpen(false)}
      />

      {/* Staging Area - Panel lateral para modo de edición oficial */}
      {isOfficialStageMode && (
        <div style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: `${STAGING_PANEL_WIDTH}px`,
          height: '100vh',
          zIndex: 1000,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)'
        }}>
          <StagingArea
            stagedEvents={getStagingEvents(eventData)}
            subjectColors={subjectColors}
            onRemoveGroupFromStaging={removeGroupFromStaging}
            onClearAll={clearAllStaged}
            onConfirmChanges={handleConfirmStagingChanges}
            confirmLoading={confirmStagingLoading}
            onClose={() => setIsOfficialStageMode(false)}
            onDragStart={(event) => setDraggingFromStaging(event)}
            onDragEnd={() => setDraggingFromStaging(null)}
            onDropFromSchedule={handleDropFromSchedule}
            errors={errors.filter(err =>
              err.seccion === seccion &&
              err.pnfId === pnf &&
              err.trayectoId === trayectoId &&
              err.trimestre === trimestre &&
              err.turn?.toLowerCase() === turn.toLowerCase()
            )}
          />
        </div>
      )}
    </>
  );
};

export default SchoolSchedule;
