import { useContext, useState, useMemo, useEffect } from "react";
import { Modal, Select, Tabs, message, Spin } from "antd";
import { FaChalkboardTeacher } from "react-icons/fa";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { turnos } from "./fucntions";
import {
  getTeacherRestriction,
  saveTeacherRestriction,
  type TeacherRestrictionPayload,
} from "../../fetch/schedule/teacherRestrictions";

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
}> = ({ putTeacherRestriction }) => {
  const { teachers } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [restrictedDays, setIsRestrictedDays] = useState<number[]>([]);
  const [restrictedHours, setRestrictedHours] = useState<HourRestriction[]>([]);
  const [activeDayTab, setActiveDayTab] = useState<string>("1");
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);
  const [savingRestrictions, setSavingRestrictions] = useState(false);

  const days: day[] = [
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miercoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
  ];

  // Calculate all unique time slots sorted by time
  const allSlots = useMemo(() => {
    const uniqueSlots = new Map<string, HourBlock>();
    Object.values(turnos).forEach((turn) => {
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
  }, []);

  const cleanUp = () => {
    setSelectedTeacher("");
    setIsRestrictedDays([]);
    setRestrictedHours([]);
    setActiveDayTab("1");
    setLoadingRestrictions(false);
    setSavingRestrictions(false);
  };

  const showModal = () => {
    cleanUp();
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    cleanUp();
    setIsModalOpen(false);
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

  useEffect(() => {
    const fetchRestrictions = async () => {
      if (!selectedTeacher) return;
      setLoadingRestrictions(true);
      try {
        const data = await getTeacherRestriction(selectedTeacher);
        setIsRestrictedDays(data?.restricted_days ?? []);
        setRestrictedHours(data?.restricted_hours ?? []);
        if ((data?.restricted_days?.length ?? 0) === 0) {
          setActiveDayTab("1");
        }
      } catch (error) {
        console.error(error);
        message.error("No se pudieron cargar las restricciones del profesor");
        setIsRestrictedDays([]);
        setRestrictedHours([]);
      } finally {
        setLoadingRestrictions(false);
      }
    };

    if (selectedTeacher) {
      fetchRestrictions();
    } else {
      setIsRestrictedDays([]);
      setRestrictedHours([]);
    }
  }, [selectedTeacher]);

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
              {loadingRestrictions ? (
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
