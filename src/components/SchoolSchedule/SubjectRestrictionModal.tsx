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
  putSubjectRestriction: (subjectName: string, classroomIds: string[], pnfId?: string) => Promise<void> | void;
  classrooms: Classroom[];
  onClassroomCreated?: () => Promise<void> | void;
  subjectRestrictions: { subjectKey: string; subjectName: string; classroomIds: string[]; pnfId?: string }[];
  loadingSubjectRestrictions?: boolean;
}> = ({
  putSubjectRestriction,
  classrooms,
  onClassroomCreated,
  subjectRestrictions,
  loadingSubjectRestrictions = false,
}) => {
    const { subjects, pnfList, userData, userPNF } = useContext(MainContext) as MainContextValues;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedPnf, setSelectedPnf] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");

    const sortedClassrooms = useMemo(() => {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      return [...classrooms].sort((a, b) => collator.compare(a.classroom, b.classroom));
    }, [classrooms]);

    const [restrictedClassrooms, setRestrictedClassrooms] = useState<string[]>(
      sortedClassrooms.map((room) => room.id)
    );
    const [newClassroomName, setNewClassroomName] = useState("");
    const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);

    const pnfOptions = useMemo(() => {
      if (!pnfList) return [];
      return pnfList.map((pnf) => ({
        value: pnf.id,
        label: pnf.name,
      }));
    }, [pnfList]);

    const subjectOptions = useMemo(() => {
      if (!subjects) return [];
      const uniqueSubjects = new Map<string, string>();

      subjects.forEach((subject) => {
        if (subject.linkedToSection) return;
        // Filter by selected PNF
        if (selectedPnf && subject.pnfId !== selectedPnf) return;

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
    }, [subjects, selectedPnf]);

    const showModal = () => {
      setRestrictedClassrooms(sortedClassrooms.map((room) => room.id));
      const cleanUserPNF = userPNF?.replace(/"/g, "");
      setSelectedPnf(cleanUserPNF || "");
      setSelectedSubject("");
      setIsModalOpen(true);
    };

    const selectedSubjectKey = selectedSubject ? normalizeText(selectedSubject) : "";

    const syncRestrictionsWithSelection = () => {
      if (!selectedSubjectKey) {
        setRestrictedClassrooms(sortedClassrooms.map((room) => room.id));
        return;
      }

      const existing = subjectRestrictions?.find(
        (rest) => rest.subjectKey === selectedSubjectKey && (!selectedPnf || rest.pnfId === selectedPnf)
      );
      if (existing) {
        setRestrictedClassrooms(existing.classroomIds);
      } else {
        setRestrictedClassrooms(sortedClassrooms.map((room) => room.id));
      }
    };

    useEffect(() => {
      syncRestrictionsWithSelection();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSubjectKey, selectedPnf, subjectRestrictions, sortedClassrooms]);

    const handleCancel = () => {
      setIsModalOpen(false);
    };

    const handleOk = async () => {
      if (!selectedPnf) {
        message.warning("Debe seleccionar un PNF");
        return;
      }
      if (!selectedSubject) {
        message.warning("Debe seleccionar una materia");
        return;
      }
      setIsSaving(true);
      try {
        await putSubjectRestriction(selectedSubject, restrictedClassrooms, selectedPnf || undefined);
        message.success("Restricciones guardadas correctamente");
        setIsModalOpen(false);
      } catch (error: any) {
        // error already handled in SchoolSchedule.tsx or can be shown here
        console.error(error);
        message.error(error.message || "Error al intentar guardar las restricciones");
      } finally {
        setIsSaving(false);
      }
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
      setRestrictedClassrooms(sortedClassrooms.map((room) => room.id));
    };

    const clearClassrooms = () => {
      setRestrictedClassrooms([]);
    };

    const selectedCount = restrictedClassrooms.length;
    const totalClassrooms = sortedClassrooms.length;
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
          confirmLoading={isSaving}
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
              <span className={styles.modalSectionTitle}>Seleccione el PNF</span>
              <span className={styles.helperText}>
                Selecciona un PNF para aplicar restricciones a las materias de esa carrera.
              </span>
              <Select
                showSearch
                placeholder="Seleccione un PNF"
                disabled={!userData?.su}
                value={selectedPnf || undefined}
                style={{ width: "100%" }}
                onChange={(value) => {
                  setSelectedPnf(value ?? "");
                  setSelectedSubject(""); // Reset subject when PNF changes
                }}
                options={pnfOptions}
                filterOption={(input, option) =>
                  !!option?.label?.toString()?.toLowerCase()?.includes(input.toLowerCase())
                }
              />
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
                  {sortedClassrooms.map((classroom) => {
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

