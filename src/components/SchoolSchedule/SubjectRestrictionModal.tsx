import { useContext, useState } from "react";
import { Modal, Select } from "antd";
import { BiSolidSchool } from "react-icons/bi";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

interface day {
  value: number;
  label: string;
}

const SubjectRestrictionModal: React.FC<{
  putTeacherRestriction: (id: string, restricions: number[]) => void;
}> = ({ putTeacherRestriction }) => {
  const { teachers } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [restrictedDays, setRestrictedDays] = useState<number[]>([]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {
    putTeacherRestriction(selectedTeacher, restrictedDays);
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
              onChange={setSelectedTeacher}
              options={teachers?.map((teacher) => ({
                value: teacher.id,
                label: `${teacher.lastName} ${teacher.name}`,
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

