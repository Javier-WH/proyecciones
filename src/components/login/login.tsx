/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import login from "../../fetch/login";
import logo from "./proyeccionesLogo.png";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

export default function Login() {
  const { setIsAuthenticated, setUserPerfil, setUserPNF, setUserData } = useContext(
    MainContext
  ) as MainContextValues;
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("userSesion");
  }, []);

  const handleLogin = async () => {
    if (user.length === 0 || password.length === 0) {
      message.warning("Por favor, ingrese un usuario y una contraseña");
      setIsAuthenticated(false);
      return;
    }
    const data = await login({ user, password });
    if (data.error) {
      message.error(data.error);
      setIsAuthenticated(false);
      return;
    }
    setUserData(data.userData);
    setUserPNF(data?.pnf_id || "");
    setUserPerfil(data?.perfil);
    setIsAuthenticated(true);
    navigate("/app/proyecciones");
  };

  const onPressEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        rowGap: "40px",
      }}>
      <img src={logo} alt="logo" style={{ width: "280px" }} />

      <div style={{ width: "300px", display: "flex", flexDirection: "column", rowGap: "5px" }}>
        <Input
          placeholder="Usuario"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          onKeyDown={onPressEnter}
        />
        <Input.Password
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          style={{ textAlign: "center" }}
          onKeyDown={onPressEnter}
        />
        <Button onClick={handleLogin} style={{ width: "100%" }}>
          Ingresar
        </Button>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <a
            style={{ fontSize: "13px", color: "gray", cursor: "pointer" }}
            onClick={() => navigate("/singin")}>
            Crear cuenta
          </a>
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", width: "100%" }}>
        <span style={{ fontSize: "10px", color: "gray" }}> versión 0.0.2</span>
        <span style={{ fontSize: "10px", color: "gray" }}>
          {" "}
          © 2025 Proyecciones. Todos los derechos reservados
        </span>
      </div>
    </div>
  );
}

