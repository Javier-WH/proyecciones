import { useContext, useEffect, useState } from "react";
import { Modal, Select } from "antd";
import { FaChalkboardTeacher } from "react-icons/fa";
//import { BsCalendarWeek } from "react-icons/bs";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

interface day {
  value: number;
  label: string;
}

const TeacherRestrictionModal: React.FC = () => {
  const { teachers } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [restrictedDays, setRestrictedDays] = useState<number[]>([]);
  const days: day[] = [
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miercoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
  ];

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const pushRestrictedDay = (day: number) => {
    setRestrictedDays([...restrictedDays, day]);
  };

  const popRestrictedDay = (day: number) => {
    const filteredRestrictedDays = restrictedDays.filter((currentDay) => currentDay !== day);
    setRestrictedDays(filteredRestrictedDays);
  };

  const toggleRestrictedDay = (day: number) => {
    if (restrictedDays.includes(day)) {
      popRestrictedDay(day);
      return;
    }
    pushRestrictedDay(day);
  };

  const handleOk = () => {
    const restriction = {
      teacherId: selectedTeacher,
      days: restrictedDays,
    };
    console.log(restriction);
  };

  return (
    <>
      <FaChalkboardTeacher title="Restriccion por profesor" className={styles.icon} onClick={showModal} />
      <Modal
        title="Restriccion por profesor"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
        height={600}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div>
          <div className={styles.selectorContainer}>
            <span>Seleccione el profesor</span>
            <Select
              allowClear
              defaultValue={teachers?.[0]?.id || ""}
              style={{ width: "100%" }}
              onChange={setSelectedTeacher}
              options={teachers?.map((teachers) => ({
                value: teachers.id,
                label: `${teachers.lastName} ${teachers.name}`,
              }))}
            />
          </div>
          <br />
          <div className={styles.selectorContainer}>
            <span>Seleccione los dias donde el profesor puede dar clases</span>
            <div style={{ display: "flex", gap: "5px", justifyContent: "center", margin: "10px 0px" }}>
              {days.map((day) => {
                return (
                  <div
                    onClick={() => toggleRestrictedDay(day.value)}
                    style={{
                      backgroundColor: restrictedDays.includes(day.value) ? "white" : "rgb(84, 122, 226)",
                      color: restrictedDays.includes(day.value) ? "gray" : "white",
                      width: "80px",
                      height: "50px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      userSelect: "none",
                      borderRadius: "15px",
                    }}>
                    {day.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TeacherRestrictionModal;

