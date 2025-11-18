import React, { useState, useContext, useEffect } from "react";
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
} from "../../fetch/schedule/scheduleFetch";
import { Select, Modal, message, List } from "antd";
import { generateScheduleEvents, mergeConsecutiveEvents, turnos, Classroom, Event } from "./fucntions";
import TeacherRestrictionModal from "./TeacherRestrictionModal";
import SubjectRestrictionModal from "./SubjectRestrictionModal";
import ScheduleErrorsModal, { scheduleError } from "./ErrorsModal";
import { FaRegSave, FaRegFolderOpen } from "react-icons/fa";

import styles from "./modal.module.css";

export interface teacherRestriction {
  teacherId: string;
  days: number[];
}
export interface subjectRestriction {
  subjectId: string;
  classroomIds: string[];
}

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
  const [subjectRestriction, setSubjectRestriction] = useState<subjectRestriction[]>([]);
  const [trimestre, setTrimestre] = useState<"q1" | "q2" | "q3">("q1");
  const [errors, setErrors] = useState<scheduleError[]>([]);
  const firstHour = turnos?.[turn]?.[0]?.[0] ?? "07:00";
  const lastHour = turnos?.[turn]?.[turnos?.[turn]?.length - 1]?.[1] ?? "17:30";
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDataBase | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState<ScheduleDataBase[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const loadInitialData = async (): Promise<void> => {
    const classroomsData = await getClassrooms();
    if (classroomsData.error) {
      console.error(classroomsData.message);
      return;
    }
    setClassrooms(classroomsData);
  };

  const addError = (err: scheduleError) => {
    setErrors((prevErrors) => [...prevErrors, err]);
  };

  const putSubjectRestriction = (subjectId: string, classroomIds: string[]) => {
    if (!subjectId || subjectId.length === 0 || !classroomIds) return;
    const currentRestrictions: subjectRestriction[] = JSON.parse(JSON.stringify(subjectRestriction));

    if (classroomIds.length === 0) {
      const filteredRestrictions = currentRestrictions.filter(
        (rest: subjectRestriction) => rest.subjectId !== subjectId
      );
      setSubjectRestriction(filteredRestrictions);
      return;
    }

    const currentRestriction = currentRestrictions.find(
      (rest: subjectRestriction) => rest.subjectId === subjectId
    );
    if (currentRestriction) {
      currentRestriction.classroomIds = classroomIds;
    } else {
      currentRestrictions.push({ subjectId: subjectId, classroomIds: classroomIds });
    }
    setSubjectRestriction(currentRestrictions);
  };

  const putTeacherRestriction = (id: string, restricions: number[]) => {
    if (!id || id.length === 0 || !restricions) return;
    const currentRestrictions: teacherRestriction[] = JSON.parse(JSON.stringify(teacherRestrictions));

    // si no hay restricciones, se elimina el profesor de la lista de restricciones
    if (restricions.length === 0) {
      const filteredRestrictions = currentRestrictions.filter(
        (rest: teacherRestriction) => rest.teacherId !== id
      );
      setTeacherRestrictions(filteredRestrictions);
      return;
    }

    const currentRestriction = currentRestrictions.find((rest: teacherRestriction) => rest.teacherId === id);
    if (currentRestriction) {
      currentRestriction.days = restricions;
    } else {
      currentRestrictions.push({ teacherId: id, days: restricions });
    }
    setTeacherRestrictions(currentRestrictions);
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
    setSelectedScheduleId(null);

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

  // Función que se ejecuta al presionar "Abrir" dentro del Modal
  const handleOpenScheduleOk = () => {
    if (!selectedScheduleId) {
      message.warning("Por favor, selecciona un horario para abrir.");
      return; // El Modal no se cerrará
    }

    // 1. Encontrar el objeto completo del horario seleccionado
    const selectedSchedule = scheduleList.find((s) => s.id === selectedScheduleId);

    if (!selectedSchedule) {
      message.error("Error: Horario seleccionado no encontrado en la lista.");
      return;
    }

    try {
      // 2. Parsear el JSON string y cargar los eventos
      const loadedEvents: EventInput[] = JSON.parse(selectedSchedule.schedule);
      setEvents(loadedEvents);

      // 3. Cerrar el modal y notificar éxito
      setIsScheduleModalOpen(false);
      message.success(`Horario "${selectedSchedule.name}" cargado con éxito.`);
    } catch (error) {
      console.error("Error parsing schedule data:", error);
      message.error(`Error al procesar los datos del horario "${selectedSchedule.name}".`);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // genera lops eventos del horario
  useEffect(() => {
    if (!classrooms || classrooms.length === 0 || !subjects || subjects.length === 0) return;
    setErrors([]);

    const eventsdata = generateScheduleEvents({
      subjects: subjects as Subject[], // la lista de materias
      classrooms: classrooms, // la lista de aulas
      trimestre: trimestre, // el trimeste a generar el horario
      preferredClassrooms: subjectRestriction, //las restricciones de materias por aulas de clase
      unavailableDays: teacherRestrictions, // restricciones de dias donde el profesor no puede dar clases
      conserveSlots: 3, // el numero maximo de horas consecutivas que una materia puede ser vista en un dia
      setErrors: addError,
    });

    setEventData(eventsdata);
  }, [classrooms, subjects, teacherRestrictions, trimestre, subjectRestriction]);

  // filtra los eventos segun el turno, seccion, pnf y trayecto y los agrupa
  useEffect(() => {
    if (!eventData || eventData.length === 0) return;
    const filteredByPnf = eventData.filter(
      (event) =>
        event.extendedProps.pnfId === pnf &&
        event.extendedProps.seccion === seccion &&
        event.extendedProps.trayectoId === trayectoId &&
        event.extendedProps.turnName.toLowerCase() === turn
    );
    setEvents(mergeConsecutiveEvents(filteredByPnf));
  }, [eventData, turn, seccion, pnf, trayectoId]);

  return (
    <>
      <h2>Nuevo Horario</h2>
      <div className="schedule-select-main-container">
        <div className="schedule-select-container">
          <div className="schedule-select">
            <span>Turno:</span>
            <Select
              defaultValue={Object.keys(turnos)[0]}
              style={{ width: 150 }}
              onChange={setTurn}
              options={Object.keys(turnos).map((turn) => ({ value: turn, label: turn }))}
            />
          </div>

          <div className="schedule-select">
            <span>Sección:</span>
            <Select
              defaultValue={eventData[0]?.extendedProps?.seccion}
              style={{ width: 150 }}
              onChange={setSeccion}
              options={Array.from(new Set(eventData.map((event) => event?.extendedProps?.seccion)))
                .filter(Boolean)
                .map((seccion) => ({
                  value: seccion,
                  label: `Sección ${seccion}`,
                }))}
            />
          </div>

          <div className="schedule-select">
            <span>PNF:</span>
            <Select
              value={pnf}
              style={{ width: 300 }}
              onChange={setPnf}
              options={Array.from(
                new Map(
                  eventData
                    .filter((event) => event?.extendedProps?.pnfId && event?.extendedProps?.pnfName)
                    .map((event) => [event.extendedProps.pnfId, event.extendedProps.pnfName])
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
              value={trayectoId}
              style={{ width: 200 }}
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
              value={trimestre}
              style={{ width: 200 }}
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
          <div style={{ display: "flex", gap: "10px", width: "180px" }}>
            <FaRegFolderOpen title="Abrir Horarios" className={styles.icon} onClick={openSchedule} />
            <FaRegSave title="Guardar Horario" className={styles.icon} onClick={saveSchedule} />
            <TeacherRestrictionModal putTeacherRestriction={putTeacherRestriction} />
            <SubjectRestrictionModal putSubjectRestriction={putSubjectRestriction} classrooms={classrooms} />
            <ScheduleErrorsModal errors={errors} />
          </div>
        </div>

        <div
          style={{
            height: "100%",
            width: "100%",
            maxWidth: "1200px",
            maxHeight: `${turnos?.[turn]?.length * 80}px`,
            margin: "0 auto",
          }}>
          <div className="calendar-container">
            <FullCalendar
              key={turn}
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
              contentHeight={1400}
              eventContent={(arg) => {
                const { event } = arg;
                const title = event.title;
                const professorId = event.extendedProps?.professorId;
                const classroomName = event.extendedProps?.classroomName;
                const teacherName = `${teachers?.find((teacher) => teacher.id === professorId)?.lastName} ${
                  teachers?.find((teacher) => teacher.id === professorId)?.name
                }`;
                return (
                  <div className="fc-event-custom">
                    <div>
                      <strong>{title}</strong>
                    </div>
                    <div style={{ fontSize: "0.75em", color: "#555" }}>Profesor: {teacherName}</div>
                    <div style={{ fontSize: "0.75em", color: "#777" }}>{classroomName}</div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      <Modal
        title="Abrir Horario Guardado"
        open={isScheduleModalOpen}
        onOk={handleOpenScheduleOk}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          setSelectedScheduleId(null);
        }}
        okText="Abrir Horario"
        cancelText="Cancelar">
        <p>Selecciona un horario de la lista para cargarlo:</p>
        <List
          size="small"
          bordered
          dataSource={scheduleList}
          renderItem={(schedule: ScheduleDataBase) => (
            <List.Item
              style={{
                cursor: "pointer",
                // Resaltar el elemento seleccionado
                backgroundColor: selectedScheduleId === schedule.id ? "#e6f7ff" : "transparent",
              }}
              onClick={() => setSelectedScheduleId(schedule?.id || null)}>
              {schedule.name}
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default SchoolSchedule;

