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
  pnfName: string;
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
        okButtonProps={{ style: { display: "none" } }}
        cancelText="Cerrar"
        width={600}
        // height property is not a valid prop for Modal in recent antd versions, but keeping if it was there or removing if invalid. 
        // Based on previous file content, 'height' was passed. It might be a custom wrapper or ignored. 
        // I will keep it to minimize distinct changes, but standard antd Modal doesn't use height prop directly usually (uses style or bodyStyle).
        // effective removal of ok button:
        onCancel={handleCancel}>
        <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
          {errorList?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "gray" }}>
              No hay errores registrados.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {errorList.map((err, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#fff1f0",
                    border: "1px solid #ffccc7",
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <MdOutlineErrorOutline
                    style={{
                      fontSize: "24px",
                      color: "#ff4d4f",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#cf1322",
                      }}
                    >
                      {err.name}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "8px",
                        fontSize: "12px",
                        color: "#595959",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#fff",
                          border: "1px solid #d9d9d9",
                          borderRadius: "4px",
                          padding: "0 6px",
                        }}
                      >
                        Sección {err.seccion}
                      </span>
                      <span
                        style={{
                          backgroundColor: "#fff",
                          border: "1px solid #d9d9d9",
                          borderRadius: "4px",
                          padding: "0 6px",
                        }}
                      >
                        {err.turn}
                      </span>
                      <span
                        style={{
                          backgroundColor: "#fff",
                          border: "1px solid #d9d9d9",
                          borderRadius: "4px",
                          padding: "0 6px",
                        }}
                      >
                        {err.year}
                      </span>
                      {err.pnfName && (
                        <span
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #d9d9d9",
                            borderRadius: "4px",
                            padding: "0 6px",
                          }}
                        >
                          {err.pnfName}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#434343",
                        lineHeight: "1.5",
                      }}
                    >
                      {err.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ScheduleErrorsModal;

