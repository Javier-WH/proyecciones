import { Button, Divider } from "antd";
import { useNavigate } from "react-router-dom";

const BUTTON_STYLE = {
  width: "200px",
  margin: "10px 0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "40px",
  fontSize: "16px",
  backgroundColor: "#1890ff",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};
export default function AdminPanel() {
  const navigate = useNavigate();

  const handleCreateUserClick = () => {
    // Puedes enviar un objeto con cualquier información que necesites
    navigate("/app/singin", { state: { redirect: "/app/admin" } });
  };

  const handleUpdateUserClick = () => {
    // Puedes enviar un objeto con cualquier información que necesites
    navigate("/app/singin", { state: { redirect: "/app/admin", update: true } });
  };

  return (
    <div className="admin-panel">
      <h1>Panel del Administrador del Sistema</h1>
      <p>Este es el panel de administración donde puedes gestionar la aplicación.</p>
      <Divider orientation="left">Usuarios</Divider>
      <div style={{ display: "flex", paddingLeft: "20px", gap: "20px" }}>
        <Button style={BUTTON_STYLE} type="primary" onClick={handleCreateUserClick}>
          Crear Usuario
        </Button>
        <Button style={BUTTON_STYLE} type="primary" onClick={handleUpdateUserClick}>
          Actualizar Usuario
        </Button>
      </div>

      <Divider orientation="left">Mascara</Divider>
    </div>
  );
}

