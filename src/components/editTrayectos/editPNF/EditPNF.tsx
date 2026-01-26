import { useEffect, useState } from "react";
import getPnf from "../../../fetch/getPnf";
import { PNF } from "../../../interfaces/pnf";
import { Button, Popconfirm, message } from "antd";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import EditPNFModal from "./editPNFModal";
import deletePnf from "../../../fetch/deletePNF";
export default function EditPNF() {
  const [pnfList, setPnfList] = useState<PNF[]>([]);
  const [activePNF, setActivePNF] = useState<PNF | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchPnf() {
    const response = await getPnf();
    if (!response) return;
    setPnfList(response);
  }

  useEffect(() => {
    fetchPnf();
  }, []);

  const handleDeletePNF = async (pnf: PNF) => {
    if (!pnf) return;
    const id = pnf.id;
    const response = await deletePnf({ id });
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success(response.message);
    fetchPnf();
  };

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflowY: "auto" }}>
      <EditPNFModal
        programa={activePNF}
        setprograma={setActivePNF}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        fetchPnf={fetchPnf}
      />
      <div
        className="title-bar-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}>
        <h1 style={{ margin: 0 }}>Editar Programas</h1>
        <Button
          type="primary"
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ display: "flex", alignItems: "center" }}
        >
          Agregar Programa
        </Button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "20px"
      }}>
        {pnfList.map((PNF) => (
          <div
            key={PNF.id}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #f0f0f0",
              borderLeft: `6px solid ${PNF.color || "#1890ff"}`,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  color: "#262626",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  maxWidth: "75%",
                }}
              >
                {PNF.name}
              </h3>

              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  type="primary"
                  shape="circle"
                  icon={<FiEdit2 />}
                  onClick={() => setActivePNF(PNF)}
                />
                <Popconfirm
                  title="¿Estás seguro que deseas eliminar este PNF?"
                  description="Esta operación consiste en eliminar el programa y no se puede deshacer."
                  onConfirm={() => handleDeletePNF(PNF)}
                  okText="Sí, eliminar"
                  okType="danger"
                  cancelText="No"
                >
                  <Button type="primary" shape="circle" icon={<FiTrash2 />} danger />
                </Popconfirm>
              </div>
            </div>

            <div style={{
              marginTop: "auto",
              paddingTop: "12px",
              borderTop: "1px solid #f5f5f5",
              fontSize: "0.85rem",
              color: "#8c8c8c",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: PNF.color || "#1890ff"
                }}
              />
              <span>ID: {PNF.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

