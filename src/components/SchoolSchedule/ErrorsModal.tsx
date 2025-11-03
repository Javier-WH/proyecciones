import { useEffect, useState } from "react";
import { Modal } from "antd";
import { MdOutlineErrorOutline } from "react-icons/md";
//import { BsCalendarWeek } from "react-icons/bs";
import styles from "./modal.module.css";

const ScheduleErrorsModal: React.FC<{}> = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {};

  return (
    <>
      <div style={{ position: "relative", height: "30px" }}>
        <MdOutlineErrorOutline title="Errores" className={styles.icon} onClick={showModal} />
        <span
          style={{
            position: "absolute",
            backgroundColor: "red",
            color: "white",
            borderRadius: "50%",
            width: "15px",
            height: "15px",
            display: "flex",
            justifyContent: "center",
            alignContent: "center",
            bottom: "0px",
            left: "-5px",
            pointerEvents: "none",
          }}>
          3
        </span>
      </div>
      <Modal
        title="Errores de horario"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        okText="Aceptar"
        cancelText="Cancelar"
        width={600}
        height={600}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div>errors</div>
      </Modal>
    </>
  );
};

export default ScheduleErrorsModal;

