import "./proyeccionesSubjects.css";
import { useContext } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Button } from "antd";

import TablePensum from "./table/table";
import { GiAutoRepair } from "react-icons/gi";
import { useNavigate } from "react-router-dom";

export default function ProyeccionesSubjects() {
  const { subjects, proyectionsDone } = useContext(MainContext) as MainContextValues;

  const navigate = useNavigate();

  const iconStyle = { color: "white", fontSize: "2rem" };
  // si no hay proyecciones
  if (subjects?.length === 0 && proyectionsDone?.length === 0) {
    return (
      <div
        className="proyecciones-container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
        }}>
        <h1>No se ha encontrado ninguna proyección</h1>
        <Button
          style={{ height: "60px", width: "300px", fontSize: "20px" }}
          type="primary"
          icon={<GiAutoRepair style={iconStyle} />}
          onClick={() => navigate("/app/proyecciones/create")}>
          Crear proyección
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          columnGap: "3rem",
        }}>
        <h1>Materias en la Proyección</h1>
      </div>

      <TablePensum subjects={subjects} />
    </>
  );
}

