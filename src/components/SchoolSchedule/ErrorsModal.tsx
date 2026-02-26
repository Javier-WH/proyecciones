import { useEffect, useState, useMemo } from "react";
import { Modal, Select, Button, Popconfirm } from "antd";
import { MdOutlineErrorOutline } from "react-icons/md";
import { ThunderboltOutlined } from "@ant-design/icons";
import styles from "./modal.module.css";

export interface scheduleError {
  name: string;
  seccion: string;
  turn: string;
  year: string;
  description: string;
  pnfName: string;
  professorName?: string;
  trimestre?: string;
  // Identifiers for force-insert
  subjectId?: string;     // innerId of the subject
  professorId?: string;   // professor ID assigned to this subject
  trayectoId?: string;
  pnfId?: string;
  totalHours?: number;    // hours that couldn't be assigned
}

interface params {
  errors: scheduleError[];
  onForceInsert?: (error: scheduleError, ignoreRestrictions: boolean) => void;
}

const ScheduleErrorsModal: React.FC<params> = ({ errors, onForceInsert }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorList, setErrorList] = useState<scheduleError[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string>("all");
  const [loadingErrorIndex, setLoadingErrorIndex] = useState<number | null>(null);

  useEffect(() => {
    setErrorList(errors);
  }, [errors]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleForceInsert = (err: scheduleError, index: number, ignoreRestrictions: boolean) => {
    if (!onForceInsert) return;
    setLoadingErrorIndex(index);
    // Use setTimeout to allow UI to update before the potentially heavy operation
    setTimeout(() => {
      onForceInsert(err, ignoreRestrictions);
      setLoadingErrorIndex(null);
    }, 50);
  };

  // Obtener lista única de PNFs para el filtro
  const pnfOptions = useMemo(() => {
    const pnfs = new Set<string>();
    errors.forEach(err => {
      if (err.pnfName) pnfs.add(err.pnfName);
    });

    const options = Array.from(pnfs).sort().map(pnf => ({
      value: pnf,
      label: pnf
    }));

    return [{ value: "all", label: "Todos los PNF" }, ...options];
  }, [errors]);

  // Filtrar la lista de errores según el PNF seleccionado
  const filteredErrors = useMemo(() => {
    if (selectedPnf === "all") return errorList;
    return errorList.filter(err => err.pnfName === selectedPnf);
  }, [errorList, selectedPnf]);

  // Check if an error has the data needed for force-insert
  const canForceInsert = (err: scheduleError) => {
    return !!(err.subjectId && onForceInsert);
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
        onCancel={handleCancel}>

        {/* Filtro por PNF */}
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: "600", fontSize: "14px" }}>Filtrar por PNF:</span>
          <Select
            style={{ flex: 1 }}
            value={selectedPnf}
            onChange={setSelectedPnf}
            options={pnfOptions}
            placeholder="Seleccione un PNF"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
          {filteredErrors?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "gray" }}>
              {selectedPnf !== "all"
                ? `No hay errores para el PNF: ${selectedPnf}`
                : "No hay errores registrados."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredErrors.map((err, index) => (
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
                      {err.professorName && (
                        <span
                          style={{
                            backgroundColor: "#e6f7ff",
                            border: "1px solid #91d5ff",
                            borderRadius: "4px",
                            padding: "0 6px",
                            color: "#096dd9"
                          }}
                        >
                          Profesor: {err.professorName}
                        </span>
                      )}
                      {err.trimestre && (
                        <span
                          style={{
                            backgroundColor: "#f6ffed",
                            border: "1px solid #b7eb8f",
                            borderRadius: "4px",
                            padding: "0 6px",
                            color: "#389e0d"
                          }}
                        >
                          {err.trimestre === "q1" ? "Trimestre 1" :
                            err.trimestre === "q2" ? "Trimestre 2" :
                              err.trimestre === "q3" ? "Trimestre 3" :
                                err.trimestre}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#434343",
                        lineHeight: "1.5",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {err.description}
                    </p>

                    {/* Solving Buttons */}
                    {canForceInsert(err) && (
                      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                        <Button
                          type="primary"
                          size="small"
                          icon={<ThunderboltOutlined />}
                          loading={loadingErrorIndex === index}
                          onClick={() => handleForceInsert(err, index, false)}
                          style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
                        >
                          Intentar solucionar
                        </Button>
                        <Popconfirm
                          title="Forzar solución"
                          description="Se ignorarán las restricciones de días del profesor y aulas preferidas. ¿Continuar?"
                          onConfirm={() => handleForceInsert(err, index, true)}
                          okText="Sí, forzar"
                          cancelText="Cancelar"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="default"
                            size="small"
                            danger
                            icon={<ThunderboltOutlined />}
                            loading={loadingErrorIndex === index}
                          >
                            Forzar solución
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
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

