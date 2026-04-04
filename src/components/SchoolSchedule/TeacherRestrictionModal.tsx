import { useContext, useState, useMemo, useEffect } from "react";
import { Modal, Select, Tabs, message, Spin, Alert } from "antd";
import { FaChalkboardTeacher } from "react-icons/fa";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { turnos, Event } from "./fucntions";
import { saveTeacherRestriction, type TeacherRestrictionPayload } from "../../fetch/schedule/teacherRestrictions";


interface day {
  value: number;
  label: string;
}

interface HourBlock {
  start: string;
  end: string;
}

interface HourRestriction {
  day: number;
  start: string;
  end: string;
}

const TeacherRestrictionModal: React.FC<{
  putTeacherRestriction: (
    id: string,
    restricions: number[],
    hours: HourRestriction[]
  ) => void;
  teacherRestrictions: { teacherId: string; days: number[]; hours: HourRestriction[] }[];
  loadingTeacherRestrictions?: boolean;
  scheduleDays?: number[];
  scheduleTurnos?: Record<string, [string, string][]>;
  externalOpen?: boolean;
  externalTeacherId?: string;
  onExternalClose?: () => void;
}> = ({ putTeacherRestriction, teacherRestrictions, loadingTeacherRestrictions = false, scheduleDays, scheduleTurnos, externalOpen, externalTeacherId, onExternalClose }) => {
  const { teachers, lockedSections } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [restrictedDays, setIsRestrictedDays] = useState<number[]>([]);
  const [restrictedHours, setRestrictedHours] = useState<HourRestriction[]>([]);
  const [activeDayTab, setActiveDayTab] = useState<string>("1");
  const [savingRestrictions, setSavingRestrictions] = useState(false);
  const [activeTurnos, setActiveTurnos] = useState<Record<string, [string, string][]>>(scheduleTurnos || turnos);
  const [activeDays, setActiveDays] = useState<number[]>(scheduleDays || [1, 2, 3, 4, 5]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (scheduleTurnos) setActiveTurnos(scheduleTurnos);
  }, [scheduleTurnos]);

  useEffect(() => {
    if (scheduleDays) setActiveDays(scheduleDays);
  }, [scheduleDays]);

  const days: day[] = useMemo(() => {
    const labels = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    return activeDays.map((d) => ({ value: d, label: labels[d] || String(d) }));
  }, [activeDays]);

  // Calculate all unique time slots sorted by time
  const allSlots = useMemo(() => {
    const uniqueSlots = new Map<string, HourBlock>();
    Object.values(activeTurnos).forEach((turn) => {
      turn.forEach(([start, end]) => {
        const key = `${start}-${end}`;
        if (!uniqueSlots.has(key)) {
          uniqueSlots.set(key, { start, end });
        }
      });
    });
    return Array.from(uniqueSlots.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    );
  }, [activeTurnos]);

  const cleanUp = () => {
    setSelectedTeacher("");
    setIsRestrictedDays([]);
    setRestrictedHours([]);
    setActiveDayTab("1");
    setSavingRestrictions(false);
    setLocalError(null);
  };

  const showModal = () => {
    cleanUp();
    setIsModalOpen(true);
  };

  // Handle external open (from TeachersRestrictionsListModal)
  useEffect(() => {
    if (externalOpen && externalTeacherId) {
      cleanUp();
      setSelectedTeacher(externalTeacherId);
      setIsModalOpen(true);
    }
  }, [externalOpen, externalTeacherId]);

  const handleCancel = () => {
    cleanUp();
    setIsModalOpen(false);
    onExternalClose?.();
  };

  const toggleRestrictedDay = (day: number) => {
    if (restrictedDays.includes(day)) {
      setIsRestrictedDays(restrictedDays.filter((d) => d !== day));
    } else {
      setIsRestrictedDays([...restrictedDays, day]);
      // Remove specific hour restrictions for this day if the whole day is restricted
      setRestrictedHours(restrictedHours.filter((h) => h.day !== day));
    }
  };

  useEffect(() => {
    const activeDayNumber = Number(activeDayTab);
    if (restrictedDays.includes(activeDayNumber)) {
      const fallback = days.find((day) => !restrictedDays.includes(day.value))?.value ?? days[0].value;
      setActiveDayTab(String(fallback));
    }
  }, [restrictedDays, activeDayTab, days]);

  const toggleRestrictedHour = (day: number, start: string, end: string) => {
    const exists = restrictedHours.some(
      (h) => h.day === day && h.start === start && h.end === end
    );

    if (exists) {
      setRestrictedHours(
        restrictedHours.filter(
          (h) => !(h.day === day && h.start === start && h.end === end)
        )
      );
    } else {
      setRestrictedHours([...restrictedHours, { day, start, end }]);
    }
  };

  // Load teacher restrictions when a teacher is selected OR the modal opens
  useEffect(() => {
    if (!isModalOpen || !selectedTeacher) {
      if (!isModalOpen) {
        // Optional: clean up when closing if preferred, but handleCancel already does it
      }
      return;
    }

    const existing = teacherRestrictions.find((rest) => rest.teacherId === selectedTeacher);
    if (existing) {
      setIsRestrictedDays(existing.days ?? []);
      setRestrictedHours(existing.hours ?? []);
      // Reset to first available day tab
      if ((existing.days?.length ?? 0) === 0) {
        setActiveDayTab("1");
      } else {
        const firstAvailable = activeDays.find(d => !existing.days.includes(d));
        if (firstAvailable) setActiveDayTab(String(firstAvailable));
      }
    } else {
      setIsRestrictedDays([]);
      setRestrictedHours([]);
      setLocalError(null);
      setActiveDayTab("1");
    }
  }, [selectedTeacher, teacherRestrictions, isModalOpen, activeDays]);

  const handleSaveRestrictions = async () => {
    if (!selectedTeacher) {
      message.warning("Debe seleccionar un profesor");
      return;
    }

    const payload: TeacherRestrictionPayload = {
      teacher_id: selectedTeacher,
      restricted_days: restrictedDays,
      restricted_hours: restrictedHours,
    };

    // --- CHECK FOR LOCKED SECTION CONFLICTS ---
    for (const [sectionKey, events] of Object.entries(lockedSections)) {
      const conflictingEvent = (events as Event[]).find((ev: Event) =>
        String(ev.extendedProps?.professorId) === String(selectedTeacher) && (
          restrictedDays.includes(ev.daysOfWeek?.[0] || -1) ||
          restrictedHours.some(rh =>
            rh.day === ev.daysOfWeek?.[0] && rh.start === ev.startTime
          )
        )
      );

      if (conflictingEvent) {
        const parts = sectionKey.split('-');
        const trimestreSuffix = parts[parts.length - 1]; // q1, q2, q3
        const sectionName = conflictingEvent.extendedProps?.seccion || "desconocida";
        const trimLabel = trimestreSuffix === 'q1' ? 'Trimestre 1' : trimestreSuffix === 'q2' ? 'Trimestre 2' : 'Trimestre 3';

        setLocalError(`El profesor tiene una clase de "${conflictingEvent.title}" en la sección ${sectionName} (${trimLabel}), la cual está congelada. Descongele la sección para aplicar este cambio.`);
        return;
      }
    }

    setLocalError(null);

    try {
      setSavingRestrictions(true);
      const response = await saveTeacherRestriction(payload);
      if (response?.error) {
        message.error(response.message || "No se pudieron guardar las restricciones");
        return;
      }
      putTeacherRestriction(selectedTeacher, restrictedDays, restrictedHours);
      message.success("Restricciones guardadas correctamente");
      setIsModalOpen(false);
      onExternalClose?.();
    } catch (error) {
      console.error(error);
      message.error("Error al guardar las restricciones");
    } finally {
      setSavingRestrictions(false);
    }
  };

  return (
    <>
      <FaChalkboardTeacher
        title="Restriccion por profesor"
        className={styles.icon}
        onClick={showModal}
      />
      <Modal
        title="Restriccion por profesor"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        okText="Guardar"
        cancelText="Cancelar"
        width={800}
        confirmLoading={savingRestrictions}
        onOk={handleSaveRestrictions}
        onCancel={handleCancel}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {localError && (
            <Alert
              message="Conflicto con Sección Congelada"
              description={localError}
              type="error"
              showIcon
              closable
              onClose={() => setLocalError(null)}
              style={{ marginBottom: "10px" }}
            />
          )}
          <div>
            <span>Seleccione el profesor</span>
            <Select
              allowClear
              showSearch
              value={selectedTeacher}
              style={{ width: "100%" }}
              onChange={setSelectedTeacher}
              options={teachers?.map((teacher) => ({
                value: teacher.id,
                label: `${teacher.lastName} ${teacher.name} - ${teacher.ci}`,
              }))}
              filterOption={(input, option) =>
                !!option?.label?.toString()?.toLowerCase()?.includes(input.toLowerCase())
              }
            />
          </div>

          {selectedTeacher && (
            <>
              {loadingTeacherRestrictions ? (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
                  <Spin tip="Cargando restricciones" />
                </div>
              ) : (
                <>
                  <div>
                    <span>Días completos NO disponibles:</span>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        margin: "10px 0",
                        flexWrap: "wrap",
                      }}
                    >
                      {days.map((day) => (
                        <div
                          key={day.value}
                          onClick={() => toggleRestrictedDay(day.value)}
                          style={{
                            backgroundColor: restrictedDays.includes(day.value)
                              ? "rgb(255, 77, 79)"
                              : "rgb(84, 122, 226)",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            userSelect: "none",
                            fontWeight: "bold",
                            opacity: restrictedDays.includes(day.value) ? 1 : 0.7,
                          }}
                        >
                          {day.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span>Horas específicas NO disponibles:</span>
                    <br />
                    <span style={{ fontSize: "0.8em", color: "#666" }}>
                      (Si un día está marcado arriba en rojo, no es necesario marcar horas aquí)
                    </span>
                    <Tabs
                      activeKey={activeDayTab}
                      onChange={setActiveDayTab}
                      type="card"
                      style={{ marginTop: "10px", border: "1px solid #f0f0f0", padding: "10px", borderRadius: "4px" }}
                      items={days.map((day) => ({
                        key: String(day.value),
                        label: day.label,
                        disabled: restrictedDays.includes(day.value),
                        children: (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                              gap: "8px",
                              maxHeight: "300px",
                              overflowY: "auto",
                            }}
                          >
                            {allSlots.map((slot) => {
                              const isRestricted = restrictedHours.some(
                                (h) =>
                                  h.day === day.value &&
                                  h.start === slot.start &&
                                  h.end === slot.end
                              );
                              return (
                                <div
                                  key={`${slot.start}-${slot.end}`}
                                  onClick={() =>
                                    toggleRestrictedHour(
                                      day.value,
                                      slot.start,
                                      slot.end
                                    )
                                  }
                                  style={{
                                    border: "1px solid #d9d9d9",
                                    borderRadius: "4px",
                                    padding: "4px",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    backgroundColor: isRestricted
                                      ? "rgb(255, 77, 79)"
                                      : "white",
                                    color: isRestricted ? "white" : "black",
                                    fontSize: "0.85em",
                                  }}
                                >
                                  {slot.start} - {slot.end}
                                </div>
                              );
                            })}
                          </div>
                        ),
                      }))}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default TeacherRestrictionModal;
