import { Button } from "antd";
import { useNavigate } from "react-router-dom";
export default function AdminPanel() {
  const navigate = useNavigate();

  const handleCreateUserClick = () => {
    // Puedes enviar un objeto con cualquier información que necesites
    navigate("/singin", { state: { redirect: "/app/admin" } });
  };

  return (
    <div className="admin-panel">
      <h1>Panel del Administrador del Sistema</h1>
      <p>This is the admin panel where you can manage the application.</p>
      <Button type="primary" onClick={handleCreateUserClick}>
        {" "}
        Crear Usuario
      </Button>
    </div>
  );
}

