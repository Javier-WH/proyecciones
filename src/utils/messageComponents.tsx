import { FaRegFrownOpen } from "react-icons/fa";
export function Forbidden() {
  return (
    <h3 style={{ color: "red", textAlign: "center", marginTop: "20px", fontSize: "20px" }}>
      {" "}
      <FaRegFrownOpen /> <span>No tienes permisos suficientes para acceder a esta sección </span>
    </h3>
  );
}

