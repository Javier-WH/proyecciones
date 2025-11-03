import { useEffect, useState } from "react";
import { Modal } from "antd";
import { MdOutlineErrorOutline } from "react-icons/md";
//import { BsCalendarWeek } from "react-icons/bs";
import styles from "./modal.module.css";

interface scheduleError {
  name: string;
  description: string;
}

const ScheduleErrorsModal: React.FC<{}> = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorList, setErrorList] = useState<scheduleError[]>([]);

  useEffect(() => {
    setErrorList([
      { name: "error 1", description: "Descripcion del error 1" },
      { name: "error 2", description: "Descripcion del error 2" },
      { name: "error 3", description: "Descripcion del error 3" },
      { name: "error 4", description: "Descripcion del error 4" },
      { name: "error 5", description: "Descripcion del error 5" },
      { name: "error 6", description: "Descripcion del error 6" },
      { name: "error 7", description: "Descripcion del error 7" },
      { name: "error 8", description: "Descripcion del error 8" },
    ]);
  }, []);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {};

  return (
    <>
      {errorList.length > 0 && (
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
          {errorList.map((err) => {
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid gray",
                  padding: "10px",
                  borderRadius: "10px",
                  marginBottom: "5px",
                }}>
                <span style={{ fontSize: "16px", fontWeight: "600" }}>{err.name}</span>
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

