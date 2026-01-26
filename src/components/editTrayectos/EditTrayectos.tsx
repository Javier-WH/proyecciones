import { useContext, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Trayecto } from "../../interfaces/trayecto";
import TrayectoModal from "./TrayectoModal";
import NewTrayectoModal from "./newTrayectoModal";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Button, message, Popconfirm } from "antd";
import deleteTrayecto from "../../fetch/deleteTrayecto";
import getTrayectos from "../../fetch/getTrayectos";
import "./EditTrayectos.css";

export default function EditTrayectos() {
  const { setTrayectosList } = useContext(MainContext) as MainContextValues;

  const { trayectosList } = useContext(MainContext) as MainContextValues;
  const [selectedTrayecto, setSelectedTrayecto] = useState<Trayecto | null>(null);
  const [newTrayectoModalOpen, setNewTrayectoModalOpen] = useState<boolean>(false);

  const sortTrayectos = () => {
    if (trayectosList === undefined || trayectosList === null) return [];
    return trayectosList.sort((a: Trayecto, b: Trayecto) => a.order - b.order);
  };

  const onClickEdit = (trayecto: Trayecto) => {
    setSelectedTrayecto(trayecto);
  };

  const onClickDelete = async (trayecto: Trayecto) => {
    const id = trayecto.id;
    const response = await deleteTrayecto({ id });
    if (!response) {
      message.error("No se ha podido eliminar el trayecto");
      return;
    }
    const trayectos = await getTrayectos();
    setTrayectosList(trayectos);
    message.success("Trayecto eliminado");
  };

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflowY: "auto" }}>
      <TrayectoModal trayecto={selectedTrayecto} setSelectedTrayecto={setSelectedTrayecto} />
      <NewTrayectoModal isModalOpen={newTrayectoModalOpen} setIsModalOpen={setNewTrayectoModalOpen} />

      <div
        className="title-bar-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}>
        <h1 style={{ margin: 0 }}>Editar Lista de Trayectos</h1>
        <Button
          type="primary"
          size="large"
          onClick={() => setNewTrayectoModalOpen(true)}
          style={{ display: "flex", alignItems: "center" }}
        >
          Agregar Trayecto
        </Button>
      </div>

      {sortTrayectos().length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "40px", color: "#8c8c8c" }}>
          <h2>No se han encontrado trayectos</h2>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px"
        }}>
          {sortTrayectos().map((trayecto) => (
            <div
              key={trayecto.id}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid #f0f0f0",
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
                    fontSize: "1.2rem",
                    color: "#262626",
                    fontWeight: 600,
                    lineHeight: 1.3,
                    maxWidth: "75%",
                  }}
                >
                  {trayecto.name}
                </h3>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<FiEdit2 />}
                    onClick={() => onClickEdit(trayecto)}
                  />
                  <Popconfirm
                    title="¿Estás seguro que deseas eliminar este trayecto?"
                    description="Esta operación no se puede deshacer"
                    onConfirm={() => onClickDelete(trayecto)}
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
                justifyContent: "space-between"
              }}>
                <span>Orden: {trayecto.order}</span>
                <span>ID: {trayecto.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
