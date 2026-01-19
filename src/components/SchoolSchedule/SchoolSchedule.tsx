import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import { EventInput } from "@fullcalendar/core";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Subject } from "../../interfaces/subject";
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
import { Select, Modal, message, List } from "antd";
import { generateScheduleEvents, mergeConsecutiveEvents, turnos, Classroom, Event } from "./fucntions";
import TeacherRestrictionModal from "./TeacherRestrictionModal";
import SubjectRestrictionModal from "./SubjectRestrictionModal";
import ScheduleErrorsModal, { scheduleError } from "./ErrorsModal";
import { FaRegSave, FaRegFolderOpen, FaPlus, FaPrint } from "react-icons/fa";
import { useReactToPrint } from "react-to-print";
import PrintableSchedule from "./PrintableSchedule";

import styles from "./modal.module.css";
import { normalizeText } from "../../utils/textFilter";

export interface teacherRestriction {
  teacherId: string;
  days: number[];
  hours: { day: number; start: string; end: string }[];
}
export interface subjectRestriction {
  subjectKey: string;
  subjectName: string;
  classroomIds: string[];
}

type RawSubjectRestriction = {
  subject_name?: string;
  subjectName?: string;
  subject_key?: string;
  subjectKey?: string;
  classroom_ids?: string[];
  classroomIds?: string[];
};

type RawTeacherRestriction = {
  teacher_id?: string;
  teacherId?: string;
  restricted_days?: number[];
  days?: number[];
  restricted_hours?: { day: number; start: string; end: string }[];
  hours?: { day: number; start: string; end: string }[];
};

const SchoolSchedule: React.FC = () => {
  const { subjects, teachers, trayectosList, proyectionId } = useContext(MainContext) as MainContextValues;
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [eventData, setEventData] = useState<Event[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [turn, setTurn] = useState("mañana");
  const [seccion, setSeccion] = useState("1");
  const [pnf, setPnf] = useState("");
  const [trayectoId, setTrayectoId] = useState("");
  const [teacherRestrictions, setTeacherRestrictions] = useState<teacherRestriction[]>([]);
  const [teacherRestrictionsReady, setTeacherRestrictionsReady] = useState(false);
  const [subjectRestriction, setSubjectRestriction] = useState<subjectRestriction[]>([]);
  const [subjectRestrictionsReady, setSubjectRestrictionsReady] = useState(false);
  const [trimestre, setTrimestre] = useState<"q1" | "q2" | "q3">("q1");
  const [errors, setErrors] = useState<scheduleError[]>([]);

  // New state for view mode and selected professor
  const [viewMode, setViewMode] = useState<"pnf" | "professor" | "classroom">("pnf");
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const firstHour =
    viewMode === "professor" || viewMode === "classroom" ? "07:00" : turnos?.[turn]?.[0]?.[0] ?? "07:00";
  const lastHour =
    viewMode === "professor" || viewMode === "classroom"
      ? "21:15"
      : turnos?.[turn]?.[turnos?.[turn]?.length - 1]?.[1] ?? "17:30";
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDataBase | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState<ScheduleDataBase[]>([]);
  const [loadedScheduleEvents, setLoadedScheduleEvents] = useState<Event[]>([]); // Eventos del horario cargado

  // Ref for the printable component
  const printableRef = useRef<HTMLDivElement>(null);

  const schedulableSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    return (subjects as Subject[]).filter((subject) => !subject.linkedToSection);
  }, [subjects]);

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

      const formatted: teacherRestriction[] = raw
        .map((item: RawTeacherRestriction) => {
          const teacherId = item?.teacher_id ?? item?.teacherId;
          if (!teacherId) return null;
          return {
            teacherId,
            days: item?.restricted_days ?? item?.days ?? [],
            hours: item?.restricted_hours ?? item?.hours ?? [],
          };
        })
        .filter(Boolean) as teacherRestriction[];

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

      const formatted: subjectRestriction[] = rawRestrictions
        .map((item: RawSubjectRestriction) => {
          const subjectName = item?.subject_name ?? item?.subjectName;
          const fallbackName = subjectName ?? "";
          const subjectKey = item?.subject_key ?? item?.subjectKey ?? normalizeText(fallbackName);
          const classroomIds = item?.classroom_ids ?? item?.classroomIds ?? [];
          if (!subjectName || !subjectKey) return null;
          return {
            subjectKey,
            subjectName,
            classroomIds,
          };
        })
        .filter(Boolean) as subjectRestriction[];

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
    async (restrictions: subjectRestriction[]) => {
      if (!proyectionId) {
        throw new Error("No se pudo identificar la proyección para guardar las restricciones");
      }

      const payload = {
        proyection_id: proyectionId,
        restrictions: restrictions.map((rest) => ({
          subject_key: rest.subjectKey,
          subject_name: rest.subjectName,
          classroom_ids: rest.classroomIds,
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

  const putSubjectRestriction = async (subjectName: string, classroomIds: string[]) => {
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
    let updatedRestrictions: subjectRestriction[] = JSON.parse(JSON.stringify(subjectRestriction));

    if (classroomIds.length === 0) {
      updatedRestrictions = updatedRestrictions.filter(
        (rest: subjectRestriction) => rest.subjectKey !== normalizedName
      );
    } else {
      const currentRestriction = updatedRestrictions.find(
        (rest: subjectRestriction) => rest.subjectKey === normalizedName
      );
      if (currentRestriction) {
        currentRestriction.classroomIds = classroomIds;
        currentRestriction.subjectName = subjectName;
      } else {
        updatedRestrictions.push({ subjectKey: normalizedName, subjectName, classroomIds });
      }
    }

    setSubjectRestriction(updatedRestrictions);

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
      throw error;
    }
  };

  const putTeacherRestriction = (
    id: string,
    restricions: number[],
    hours: { day: number; start: string; end: string }[] = []
  ) => {
    if (!id || id.length === 0) return;
    const currentRestrictions: teacherRestriction[] = JSON.parse(JSON.stringify(teacherRestrictions));

    // si no hay restricciones, se elimina el profesor de la lista de restricciones
    if (restricions.length === 0 && hours.length === 0) {
      const filteredRestrictions = currentRestrictions.filter(
        (rest: teacherRestriction) => rest.teacherId !== id
      );
      setTeacherRestrictions(filteredRestrictions);
      return;
    }

    const currentRestriction = currentRestrictions.find((rest: teacherRestriction) => rest.teacherId === id);
    if (currentRestriction) {
      currentRestriction.days = restricions;
      currentRestriction.hours = hours;
    } else {
      currentRestrictions.push({ teacherId: id, days: restricions, hours: hours });
    }
    setTeacherRestrictions(currentRestrictions);
    setTeacherRestrictionsReady(true);
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

  // genera lops eventos del horario
  useEffect(() => {
    if (
      !classrooms ||
      classrooms.length === 0 ||
      schedulableSubjects.length === 0 ||
      !teacherRestrictionsReady ||
      !subjectRestrictionsReady
    ) {
      return;
    }
    setErrors([]);
    const eventsdata = generateScheduleEvents({
      subjects: schedulableSubjects, // la lista de materias (sin materias vinculadas)
      classrooms: classrooms, // la lista de aulas
      trimestre: trimestre, // el trimeste a generar el horario
      preferredClassrooms: subjectRestriction, //las restricciones de materias por aulas de clase
      unavailableDays: teacherRestrictions, // restricciones de dias donde el profesor no puede dar clases
      conserveSlots: 3, // el numero maximo de horas consecutivas que una materia puede ser vista en un dia
      existingEvents: loadedScheduleEvents, // Pasar eventos cargados para respetar esos slots
      setErrors: addError,
    });

    setEventData(eventsdata);
  }, [
    classrooms,
    schedulableSubjects,
    teacherRestrictions,
    trimestre,
    subjectRestriction,
    loadedScheduleEvents,
    teacherRestrictionsReady,
    subjectRestrictionsReady,
  ]); // Incluir para forzar regeneración al cargar

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
                  onChange={setTurn}
                  options={Object.keys(turnos).map((turn) => ({ value: turn, label: turn }))}
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
                        .filter((subject) => subject.pnfId && subject.pnf)
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
                  options={trayectosList?.map((trayecto) => ({
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
                style={{ width: 250 }}
                onChange={setSelectedProfessorId}
                options={teachers?.map((teacher) => ({
                  value: teacher.id,
                  label: `${teacher.name} ${teacher.lastName}`,
                }))}
              />
            </div>
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
                  options={classrooms?.map((classroom) => ({
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
            />
            <SubjectRestrictionModal
              putSubjectRestriction={putSubjectRestriction}
              classrooms={classrooms}
              onClassroomCreated={loadClassrooms}
              subjectRestrictions={subjectRestriction}
              loadingSubjectRestrictions={!subjectRestrictionsReady}
            />
            <ScheduleErrorsModal errors={errors} />
          </div>
        </div>

        <div className="schedule-content-wrapper">
          <div className={`calendar-container view-${viewMode}`}>
            <FullCalendar
              key={viewMode === "professor" || viewMode === "classroom" ? "full-view" : turn}
              plugins={[timeGridPlugin]}
              initialView="timeGridWeek"
              locale={esLocale}
              weekends={false}
              slotMinTime={firstHour}
              slotMaxTime={lastHour}
              slotDuration="00:45:00"
              slotLabelContent={(arg) => {
                const start = arg.date;
                const end = new Date(start.getTime() + 45 * 60000);
                const formatTime = (date: Date) =>
                  date.toLocaleTimeString("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                return `${formatTime(start)} - ${formatTime(end)}`;
              }}
              dayHeaderFormat={{ weekday: "long" }}
              allDaySlot={false}
              headerToolbar={{ left: "", center: "", right: "" }}
              events={events}
              height="100%"
              expandRows={true}
              contentHeight={viewMode === "professor" || viewMode === "classroom" ? 2200 : 1100}
              eventContent={(arg) => {
                const { event } = arg;
                const title = event.title;
                const professorId = event.extendedProps?.professorId;
                const classroomName = event.extendedProps?.classroomName;
                const seccion = event.extendedProps?.seccion;
                const pnf = event.extendedProps?.pnfName;
                const teacherName = `${teachers?.find((teacher) => teacher.id === professorId)?.lastName} ${
                  teachers?.find((teacher) => teacher.id === professorId)?.name
                }`;
                return (
                  <div className="fc-event-custom">
                    <div>
                      <strong style={{ fontSize: viewMode === "classroom" ? "0.7em" : "0.9em" }}>
                        {title}
                      </strong>
                    </div>
                    {viewMode === "professor" || viewMode === "classroom" ? (
                      <>
                        {" "}
                        <div style={{ fontSize: "0.7em", color: "#555" }}>{pnf}</div>{" "}
                        <div style={{ fontSize: "0.7em", color: "#555" }}>Sección: {seccion}</div>{" "}
                      </>
                    ) : (
                      <div style={{ fontSize: "0.75em", color: "#555" }}>Profesor: {teacherName}</div>
                    )}
                    {viewMode !== "classroom" && (
                      <div style={{ fontSize: "0.75em", color: "#777" }}>{classroomName}</div>
                    )}
                    {viewMode === "classroom" && (
                      <div style={{ fontSize: "0.75em", color: "#555" }}>Profesor: {teacherName}</div>
                    )}
                  </div>
                );
              }}
            />
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
    </>
  );
};

export default SchoolSchedule;

