import { useNavigate } from "react-router-dom"
import { Input, Button } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import logo from "./proyeccionesLogo.png"

export default function Login() {

  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/app")
  }
  return (
    <div style={
      {
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        rowGap: "40px",
      }
    }>
      <img src={logo} alt="logo" style={{ width: "280px" }} />

      <div style={{ width: "300px", display: "flex", flexDirection: "column", rowGap: "5px" }}>
        <Input placeholder="Usuario" />
        <Input.Password
          placeholder="Contraseña"
          iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          style={{ textAlign: "center" }}
        />
        <Button onClick={handleLogin} style={{ width: "100%" }}>Ingresar</Button>
      </div>
    </div>
  )
}