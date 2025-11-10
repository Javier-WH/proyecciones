import { useContext, useState } from "react";
import { Modal, Select } from "antd";
import { BiSolidSchool } from "react-icons/bi";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Classroom } from "./fucntions";

interface SubjectIem {
  value: number;
  label: string;
}

const SubjectRestrictionModal: React.FC<{
  putClassroomRestriction: (subjectId: string, classroomIds: Classroom[]) => void;
}> = ({ putClassroomRestriction }) => {
  const { subjects } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [restrictedClassrooms, setRestrictedClassrooms] = useState<Classroom[]>([]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {
    putClassroomRestriction(selectedSubject, restrictedClassrooms);
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
        <div>
          <div className={styles.selectorContainer}>
            <span>Seleccione la materia</span>
            <Select
              allowClear
              showSearch
              defaultValue=""
              style={{ width: "100%" }}
              onChange={setSelectedSubject}
              options={subjects?.map((subject) => ({
                value: subject.innerId,
                label: subject.subject,
              }))}
              filterOption={(input, option) =>
                !!option?.label?.toString()?.toLowerCase()?.includes(input.toLowerCase())
              }
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SubjectRestrictionModal;

