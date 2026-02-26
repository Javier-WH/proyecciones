import { useContext, useState, useMemo, useEffect } from "react";
import { Modal, Select, Button, message, Spin } from "antd";
import { BiSolidSchool } from "react-icons/bi";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

import { Classroom } from "./fucntions";
import { normalizeText } from "../../utils/textFilter";

const SubjectRestrictionModal: React.FC<{
  putSubjectRestriction: (subjectName: string, classroomIds: string[], pnfId?: string) => Promise<void> | void;
  classrooms: Classroom[];
  subjectRestrictions: { subjectKey: string; subjectName: string; classroomIds: string[]; pnfId?: string }[];
  loadingSubjectRestrictions?: boolean;
}> = ({
  putSubjectRestriction,
  classrooms,
  subjectRestrictions,
  loadingSubjectRestrictions = false,
}) => {
    const { subjects, pnfList, userData, userPNF, subjectColors } = useContext(MainContext) as MainContextValues;
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

    const pnfOptions = useMemo(() => {
      if (!pnfList) return [];
      return pnfList.map((pnf) => ({
        value: pnf.id,
        label: pnf.name,
      }));
    }, [pnfList]);

    const subjectOptions = useMemo(() => {
      if (!subjects) return [];
      const uniqueSubjects = new Map<string, { label: string; pnfId: string }>();

      subjects.forEach((subject) => {
        if (subject.linkedToSection) return;
        // Filter by selected PNF
        if (selectedPnf && subject.pnfId !== selectedPnf) return;

        const label = subject.subject?.trim();
        if (!label) return;
        const key = normalizeText(label);
        if (!key) return;
        if (!uniqueSubjects.has(key)) {
          uniqueSubjects.set(key, { label, pnfId: String(subject.pnfId) });
        }
      });

      return Array.from(uniqueSubjects.entries()).map(([key, data]) => {
        const existing = subjectRestrictions?.find(
          (rest) => rest.subjectKey === key && rest.pnfId === data.pnfId
        ) || subjectRestrictions?.find(
          (rest) => rest.subjectKey === key && !rest.pnfId
        );
        const hasRestriction = !!existing;
        const count = existing ? existing.classroomIds.length : 0;
        const color = subjectColors?.[data.pnfId] || "#ccc";

        return {
          value: data.label,
          label: data.label,
          hasRestriction,
          count,
          color,
        };
      });
    }, [subjects, selectedPnf, subjectRestrictions, subjectColors]);

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

      // Look for EXACT PNF match first, then generic match (no pnfId)
      const existing = subjectRestrictions?.find(
        (rest) => rest.subjectKey === selectedSubjectKey && rest.pnfId === selectedPnf
      ) || subjectRestrictions?.find(
        (rest) => rest.subjectKey === selectedSubjectKey && !rest.pnfId
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

    const handleOk = async (shouldClose = true) => {
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
        if (shouldClose) {
          setIsModalOpen(false);
        }
      } catch (error: any) {
        // error already handled in SchoolSchedule.tsx or can be shown here
        console.error(error);
        message.error(error.message || "Error al intentar guardar las restricciones");
      } finally {
        setIsSaving(false);
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
          width={720}
          height={600}
          onCancel={handleCancel}
          footer={[
            <Button key="back" onClick={handleCancel}>
              Cancelar
            </Button>,
            <Button
              key="save"
              type="primary"
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
              loading={isSaving}
              onClick={() => handleOk(false)}>
              Guardar
            </Button>,
            <Button key="submit" type="primary" loading={isSaving} onClick={() => handleOk(true)}>
              Guardar y salir
            </Button>,
          ]}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                optionRender={(option) => (
                  <div style={{ display: "flex", alignItems: "stretch", gap: "8px", padding: "4px 0" }}>
                    <div
                      style={{
                        width: "4px",
                        backgroundColor: option.data.color,
                        borderRadius: "2px",
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500 }}>{option.data.label}</span>
                      <span style={{ fontSize: "12px", color: option.data.hasRestriction ? "rgb(55, 174, 221)" : "#6b7280" }}>
                        {option.data.hasRestriction ? (
                          <>
                            <strong>{option.data.count}</strong> {option.data.count === 1 ? "aula asignada" : "aulas asignadas"}
                          </>
                        ) : (
                          "no tiene aulas asignadas"
                        )}
                      </span>
                    </div>
                  </div>
                )}
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

