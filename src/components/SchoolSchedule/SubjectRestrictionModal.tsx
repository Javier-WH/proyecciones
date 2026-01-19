import { useContext, useState } from "react";
import { Modal, Select, Input, Button, message } from "antd";
import { BiSolidSchool } from "react-icons/bi";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

import { Classroom } from "./fucntions";
import { createClassroom } from "../../fetch/schedule/scheduleFetch";

const SubjectRestrictionModal: React.FC<{
  putSubjectRestriction: (subjectId: string, classroomIds: string[]) => void;
  classrooms: Classroom[];
  onClassroomCreated?: () => Promise<void> | void;
}> = ({ putSubjectRestriction, classrooms, onClassroomCreated }) => {
  const { subjects } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const [restrictedClassrooms, setRestrictedClassrooms] = useState<string[]>(
    classrooms.map((room) => room.id)
  );
  const [newClassroomName, setNewClassroomName] = useState("");
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);

  const showModal = () => {
    setRestrictedClassrooms(classrooms.map((room) => room.id));
    setSelectedSubject("");
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {
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

  return (
    <>
      <BiSolidSchool title="Restriccion por materias" className={styles.icon} onClick={showModal} />
      <Modal
        title="Restriccion por materias"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
        height={600}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className={styles.selectorContainer}>
            <span>Agregar un nuevo salón</span>
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
            <span>Seleccione la materia</span>
            <Select
              allowClear
              showSearch
              defaultValue=""
              style={{ width: "100%" }}
              onChange={setSelectedSubject}
              options={subjects?.map((subject) => ({
                value: subject.id,
                label: subject.subject,
              }))}
              filterOption={(input, option) =>
                !!option?.label?.toString()?.toLowerCase()?.includes(input.toLowerCase())
              }
            />
          </div>
        </div>
        <br />
        <div className={styles.selectorContainer}>
          <span>Seleccione las aulas preferidas para dar esta materia</span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              width: "100%",
              height: "300px",
              overflowY: "scroll",
            }}>
            {classrooms.map((classroom) => {
              return (
                <div
                  key={classroom.id}
                  onClick={() => toggleRestrictedClassroom(classroom)}
                  style={{
                    backgroundColor: !restrictedClassrooms.includes(classroom.id)
                      ? "white"
                      : "rgb(84, 122, 226)",
                    color: !restrictedClassrooms.includes(classroom.id) ? "gray" : "white",
                    width: "100%",
                    height: "50px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                    borderRadius: "15px",
                  }}>
                  {classroom.classroom}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SubjectRestrictionModal;

