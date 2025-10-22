import React, { useState } from "react";
import { Modal, Select } from "antd";
import { FaChalkboardTeacher } from "react-icons/fa";
//import { BsCalendarWeek } from "react-icons/bs";
import styles from "./modal.module.css";

const TeacherRestrictionModal: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
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
        width={1000}
        height={600}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div></div>
      </Modal>
    </>
  );
};

export default TeacherRestrictionModal;

