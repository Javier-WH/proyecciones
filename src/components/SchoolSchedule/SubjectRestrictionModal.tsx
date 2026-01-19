import { useContext, useState, useMemo, useEffect } from "react";
import { Modal, Select, Input, Button, message, Spin } from "antd";
import { BiSolidSchool } from "react-icons/bi";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

import { Classroom } from "./fucntions";
import { createClassroom } from "../../fetch/schedule/scheduleFetch";
import { normalizeText } from "../../utils/textFilter";

const SubjectRestrictionModal: React.FC<{
  putSubjectRestriction: (subjectName: string, classroomIds: string[]) => void;
  classrooms: Classroom[];
  onClassroomCreated?: () => Promise<void> | void;
  subjectRestrictions: { subjectKey: string; subjectName: string; classroomIds: string[] }[];
  loadingSubjectRestrictions?: boolean;
}> = ({
  putSubjectRestriction,
  classrooms,
  onClassroomCreated,
  subjectRestrictions,
  loadingSubjectRestrictions = false,
}) => {
  const { subjects } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const [restrictedClassrooms, setRestrictedClassrooms] = useState<string[]>(
    classrooms.map((room) => room.id)
  );
  const [newClassroomName, setNewClassroomName] = useState("");
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);

  const subjectOptions = useMemo(() => {
    if (!subjects) return [];
    const uniqueSubjects = new Map<string, string>();

    subjects.forEach((subject) => {
      if (subject.linkedToSection) return;
      const label = subject.subject?.trim();
      if (!label) return;
      const key = normalizeText(label);
      if (!key) return;
      if (!uniqueSubjects.has(key)) {
        uniqueSubjects.set(key, label);
      }
    });

    return Array.from(uniqueSubjects.values()).map((label) => ({
      value: label,
      label,
    }));
  }, [subjects]);

  const showModal = () => {
    setRestrictedClassrooms(classrooms.map((room) => room.id));
    setSelectedSubject("");
    setIsModalOpen(true);
  };

  const selectedSubjectKey = selectedSubject ? normalizeText(selectedSubject) : "";

  const syncRestrictionsWithSelection = () => {
    if (!selectedSubjectKey) {
      setRestrictedClassrooms(classrooms.map((room) => room.id));
      return;
    }

    const existing = subjectRestrictions?.find((rest) => rest.subjectKey === selectedSubjectKey);
    if (existing) {
      setRestrictedClassrooms(existing.classroomIds);
    } else {
      setRestrictedClassrooms(classrooms.map((room) => room.id));
    }
  };

  useEffect(() => {
    syncRestrictionsWithSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectKey, subjectRestrictions, classrooms]);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {
    if (!selectedSubject) {
      message.warning("Debe seleccionar una materia");
      return;
    }
    putSubjectRestriction(selectedSubject, restrictedClassrooms);
  };

  const handleCreateClassroom = async () => {
    const trimmedName = newClassroomName.trim();
    if (!trimmedName) {
      message.warning("Debe ingresar el nombre del salón");
      return;
    }

    setIsCreatingClassroom(true);
    try {
      const response = await createClassroom(trimmedName);
      if (response?.error) {
        const errorMessage = response?.message?.message || response?.message || "No se pudo crear el salón";
        message.error(errorMessage);
        return;
      }
      message.success("Salón creado correctamente");
      setNewClassroomName("");
      if (typeof onClassroomCreated === "function") {
        await onClassroomCreated();
      }
    } catch (error) {
      console.error(error);
      message.error("Error al crear el salón");
    } finally {
      setIsCreatingClassroom(false);
    }
  };

  const pushRestricteClassroom = (roomid: string) => {
    setRestrictedClassrooms([...restrictedClassrooms, roomid]);
  };

  const popRestrictedClassroom = (room: string) => {
    const filteredRestrictedClassrooms = restrictedClassrooms.filter(
      (currentClassroom) => currentClassroom !== room
    );
    setRestrictedClassrooms(filteredRestrictedClassrooms);
  };

  const toggleRestrictedClassroom = (room: Classroom) => {
    if (restrictedClassrooms.includes(room.id)) {
      popRestrictedClassroom(room.id);
      return;
    }
    pushRestricteClassroom(room.id);
  };

  const selectAllClassrooms = () => {
    setRestrictedClassrooms(classrooms.map((room) => room.id));
  };

  const clearClassrooms = () => {
    setRestrictedClassrooms([]);
  };

  const selectedCount = restrictedClassrooms.length;
  const totalClassrooms = classrooms.length;
  const unselectedCount = Math.max(totalClassrooms - selectedCount, 0);

  return (
    <>
      <BiSolidSchool title="Restriccion por materias" className={styles.icon} onClick={showModal} />
      <Modal
        title="Restriccion por materias"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        okText="Guardar"
        cancelText="Cancelar"
        width={720}
        height={600}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className={styles.selectorContainer}>
            <span className={styles.modalSectionTitle}>Agregar un nuevo salón</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <Input
                placeholder="Ej: LAB A-101"
                value={newClassroomName}
                onChange={(e) => setNewClassroomName(e.target.value)}
                onPressEnter={handleCreateClassroom}
              />
              <Button type="primary" onClick={handleCreateClassroom} loading={isCreatingClassroom}>
                Agregar
              </Button>
            </div>
          </div>

          <div className={styles.selectorContainer}>
            <span className={styles.modalSectionTitle}>Seleccione la materia</span>
            <Select
              allowClear
              showSearch
              value={selectedSubject || undefined}
              style={{ width: "100%" }}
              onChange={(value) => setSelectedSubject(value ?? "")}
              options={subjectOptions}
              filterOption={(input, option) =>
                !!option?.label?.toString()?.toLowerCase()?.includes(input.toLowerCase())
              }
            />
          </div>
        </div>
        <br />
        <div className={styles.selectorContainer}>
          <span className={styles.modalSectionTitle}>Seleccione las aulas preferidas</span>
          <span className={styles.helperText}>
            Define en cuáles salones se permitirá dictar la materia seleccionada. Si no seleccionas ninguna, se
            interpretará que la materia no tiene restricciones.
          </span>

          {!selectedSubject ? (
            <div className={styles.emptyState}>
              Selecciona una materia para gestionar sus aulas disponibles.
            </div>
          ) : loadingSubjectRestrictions ? (
            <div className={styles.emptyState}>
              <Spin size="small" />
              <div>Cargando restricciones...</div>
            </div>
          ) : (
            <>
              <div className={styles.classroomToolbar}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryPill}>{selectedCount} aulas permitidas</span>
                  <span className={styles.summaryPill}>{unselectedCount} sin seleccionar</span>
                </div>
                <Button size="small" onClick={selectAllClassrooms} disabled={selectedCount === totalClassrooms}>
                  Seleccionar todas
                </Button>
                <Button size="small" onClick={clearClassrooms} disabled={selectedCount === 0}>
                  Limpiar selección
                </Button>
              </div>

              <div className={styles.classroomGrid}>
                {classrooms.map((classroom) => {
                  const isSelected = restrictedClassrooms.includes(classroom.id);
                  return (
                    <div
                      key={classroom.id}
                      className={`${styles.classroomChip} ${isSelected ? styles.classroomChipActive : ""}`}
                      onClick={() => toggleRestrictedClassroom(classroom)}>
                      <span className={styles.classroomName}>{classroom.classroom}</span>
                      <span
                        className={styles.classroomStatus}
                        style={{ color: isSelected ? "#2563eb" : "#9ca3af" }}>
                        {isSelected ? "Incluida" : "No incluida"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default SubjectRestrictionModal;

