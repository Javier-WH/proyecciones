import { Input, Select, Button, message, Modal } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useState, useContext, useEffect } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import postUser from "../../fetch/postUser";
import { useNavigate, useLocation } from "react-router-dom";

export default function CreateUserPanel() {
  const location = useLocation();
  const { redirect } = location.state || {};
  const digitsOnlyRegex = /^\d*$/;
  const { pnfList } = useContext(MainContext) as MainContextValues;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<"error" | "warning" | "">("");
  const [lastName, setLastName] = useState("");
  const [lastNameStatus, setLastNameStatus] = useState<"error" | "warning" | "">("");
  const [ci, setCi] = useState("");
  const [ciStatus, setCiStatus] = useState<"error" | "warning" | "">("");
  const [user, setUser] = useState("");
  const [userStatus, setUserStatus] = useState<"error" | "warning" | "">("");
  const [password, setPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"error" | "warning" | "">("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordStatus, setConfirmPasswordStatus] = useState<"error" | "warning" | "">("");
  const [pnfOptions, setPnfOptions] = useState<{ value: string; label: string }[]>([]);
  const [pnfValue, setPnfValue] = useState<string | null>(null);
  const [pnfStatus, setPnfStatus] = useState<"error" | "warning" | "">("");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalPassword, setModalPassword] = useState("");
  const CORRECT_MODAL_PASSWORD = "hola1234"; // esto se debe modificar mas adelante

  useEffect(() => {
    if (!pnfList) return;
    setPnfOptions(pnfList.map((pnf) => ({ value: pnf.id.toString(), label: pnf.name.toString() })));
  }, [pnfList]);

  const onChangeNames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setNameStatus("error");
    } else {
      setNameStatus("");
    }
    setName(value);
  };

  const onChangeLastNames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setLastNameStatus("error");
    } else {
      setLastNameStatus("");
    }
    setLastName(value);
  };

  const onChangeCI = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setCiStatus("error");
    } else if (!digitsOnlyRegex.test(value)) {
      setCiStatus("error");
    } else {
      setCiStatus("");
    }
    setCi(value);
  };

  const onChangeUser = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setUserStatus("error");
    } else {
      setUserStatus("");
    }
    setUser(value);
  };

  const onChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setPasswordStatus("error");
    } else {
      setPasswordStatus("");
    }
    setPassword(value);
  };

  const onChangeConfirmPassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setConfirmPasswordStatus("error");
    } else if (password !== value) {
      setConfirmPasswordStatus("warning");
    } else {
      setConfirmPasswordStatus("");
    }
    setConfirmPassword(value);
  };

  const onBlurConfirmPassword = () => {
    if (password !== confirmPassword) {
      setConfirmPasswordStatus("error");
    } else {
      setConfirmPasswordStatus("");
    }
  };

  const handlePNFChange = (value: string) => {
    setPnfStatus("");
    setPnfValue(value);
  };

  const getLabelColor = (status: "error" | "warning" | "") => {
    switch (status) {
      case "error":
        return "red";
      case "warning":
        return "orange";
      default:
        return "gray";
    }
  };

  const handleCreateUser = () => {
    if (
      name === "" ||
      lastName === "" ||
      ci === "" ||
      user === "" ||
      password === "" ||
      confirmPassword === "" ||
      pnfValue === null
    ) {
      name === "" && setNameStatus("error");
      lastName === "" && setLastNameStatus("error");
      ci === "" && setCiStatus("error");
      user === "" && setUserStatus("error");
      password === "" && setPasswordStatus("error");
      confirmPassword === "" && setConfirmPasswordStatus("error");
      pnfValue === null && setPnfStatus("error");
      message.error("Todos los campos son obligatorios");
      return;
    }
    if (!digitsOnlyRegex.test(ci)) {
      message.error("La cedula debe ser un número");
      return;
    }
    if (password !== confirmPassword) {
      message.error("Las contraseñas no coinciden");
      return;
    }

    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    if (
      name === "" ||
      lastName === "" ||
      ci === "" ||
      user === "" ||
      password === "" ||
      confirmPassword === "" ||
      pnfValue === null
    )
      return;
    if (modalPassword === CORRECT_MODAL_PASSWORD) {
      setIsModalVisible(false); // Close the modal
      const data = {
        name,
        last_name: lastName,
        ci,
        user,
        password,
        su: false,
        pnf_id: pnfValue,
      };

      postUser(data)
        .then((res) => {
          if (res.error) {
            message.error(res.error);
            return;
          }
          message.success("Usuario creado correctamente");
          if (redirect) {
            navigate(redirect);
            return;
          }
          navigate("/");
        })
        .catch((error) => {
          message.error("Error al crear el usuario " + error);
        });
    } else {
      message.error("Contraseña incorrecta");
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false); // Close the modal
    setModalPassword(""); // Clear the modal password
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        rowGap: "20px",
        width: "100%",
        maxWidth: "600px",
        margin: "20px auto",
      }}>
      <div style={{ marginBottom: "20px" }}>
        <h2>Crear usuario</h2>
      </div>
      <div>
        <label style={{ color: getLabelColor(nameStatus) }}>Nombres</label>
        <Input status={nameStatus} placeholder="Nombres" value={name} onChange={onChangeNames} />
      </div>
      <div>
        <label style={{ color: getLabelColor(lastNameStatus) }}>Apellidos</label>
        <Input
          status={lastNameStatus}
          placeholder="Apellidos"
          value={lastName}
          onChange={onChangeLastNames}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <label style={{ color: getLabelColor(ciStatus) }}>Cédula</label>
          <Input status={ciStatus} placeholder="Cédula" value={ci} onChange={onChangeCI} />
        </div>

        <div>
          <label style={{ display: "block", color: getLabelColor(pnfStatus) }}>Programa</label>
          <Select
            status={pnfStatus}
            style={{ width: "100%" }}
            onChange={handlePNFChange}
            options={pnfOptions}
          />
        </div>
      </div>

      <div>
        <label style={{ color: getLabelColor(userStatus) }}>Usuario</label>
        <Input status={userStatus} placeholder="Usuario" value={user} onChange={onChangeUser} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <label style={{ color: getLabelColor(passwordStatus) }}>Contraseña</label>
          <Input.Password
            placeholder="Contraseña"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            value={password}
            onChange={onChangePassword}
            status={passwordStatus}
          />
        </div>
        <div>
          <label style={{ color: getLabelColor(confirmPasswordStatus) }}>Confirmar contraseña</label>
          <Input.Password
            placeholder="Confirmar contraseña"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            value={confirmPassword}
            onChange={onChangeConfirmPassword}
            status={confirmPasswordStatus}
            onBlur={onBlurConfirmPassword}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "30px" }}>
        <Button onClick={() => (redirect ? navigate(redirect) : navigate("/"))} type="default">
          Regresar
        </Button>
        <Button onClick={handleCreateUser} type="primary">
          Crear
        </Button>
      </div>

      <Modal
        title="Confirmar creación de usuario"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Confirmar"
        cancelText="Cancelar">
        <p>Por favor, introduce la contraseña para confirmar la creación del usuario:</p>
        <Input.Password
          placeholder="Contraseña de confirmación"
          value={modalPassword}
          onChange={(e) => setModalPassword(e.target.value)}
          onPressEnter={handleModalOk} // Allows pressing Enter to confirm
        />
      </Modal>
    </div>
  );
}

