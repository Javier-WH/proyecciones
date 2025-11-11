import { useEffect, useState } from "react";
import { Modal } from "antd";
import { MdOutlineErrorOutline } from "react-icons/md";
//import { BsCalendarWeek } from "react-icons/bs";
import styles from "./modal.module.css";

export interface scheduleError {
  name: string;
  seccion: string;
  turn: string;
  year: string;
  description: string;
}

interface params {
  errors: scheduleError[];
}

const ScheduleErrorsModal: React.FC<params> = ({ errors }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorList, setErrorList] = useState<scheduleError[]>([]);

  useEffect(() => {
    setErrorList(errors);
  }, [errors]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {};

  return (
    <>
      {errorList?.length > 0 && (
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
            {errorList.length}
          </span>
        </div>
      )}
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
        <div style={{ maxHeight: "500px", overflow: "auto" }}>
          {errorList?.map((err, index) => {
            return (
              <div
                key={err.name + index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid gray",
                  padding: "10px",
                  borderRadius: "10px",
                  marginBottom: "5px",
                }}>
                <span style={{ fontSize: "16px", fontWeight: "600" }}>{err.name}</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span>{`Seccion ${err.seccion}`}</span>
                  <span>{err.turn}</span>
                  <span>{err.year}</span>
                </div>
                <span>{err.description}</span>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
};

export default ScheduleErrorsModal;

