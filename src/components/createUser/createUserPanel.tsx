import { Input, Select, Button, message, Checkbox } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useState, useContext, useEffect } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import postUser from "../../fetch/postUser";
import getUser from "../../fetch/getUser";
import putUser from "../../fetch/putUser";
import { useNavigate, useLocation } from "react-router-dom";

export interface UserData {
  name: string;
  last_name: string;
  ci: string;
  user: string;
  password: string;
  su: boolean;
  pnf_id: string | null;
}

export default function CreateUserPanel() {
  const location = useLocation();
  const { redirect, update } = location.state || {};
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
  const [superUser, setSuperUser] = useState(false);
  const [searchUser, setSearchUser] = useState<string>("");
  const [userToUpdate, setUserToUpdate] = useState<UserData | null>(null);

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

  const handleSearchUser = () => {
    if (searchUser === "") {
      message.error("Por favor, ingrese una cédula para buscar");
      return;
    }
    getUser(searchUser)
      .then((res) => {
        if (res.error) {
          message.error(res.error);
          return;
        }
        if (!res.user) {
          message.error("Usuario no encontrado");
          return;
        }
        console.log(res.pnf_id);
        setUserToUpdate(res);
        setName(res.name);
        setLastName(res.last_name);
        setCi(res.ci);
        setUser(res.user);
        setPnfValue(res.pnf_id);
        setSuperUser(res.su);
        setPassword("");
        setConfirmPassword("");
      })
      .catch((error) => {
        message.error("Error al buscar el usuario: " + error);
      });
    setSearchUser(""); // Limpiar el campo de búsqueda después de buscar
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

    const data = {
      name,
      last_name: lastName,
      ci,
      user,
      password,
      su: superUser,
      pnf_id: pnfValue,
    };

    if (update && userToUpdate) {
      putUser(data)
        .then((res) => {
          if (res.error) {
            message.error(res.error);
            return;
          }
          message.success("Usuario actualizado correctamente");
          if (redirect) {
            navigate(redirect);
            return;
          }
          navigate("/");
        })
        .catch((error) => {
          message.error("Error al actualizar el usuario " + error);
        });
      return;
    }

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
  };

  const handleKeyDownOnSearchUser = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchUser();
    }
    setUserToUpdate(null);
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
        <h2>{update ? "Actualizar Usuario" : "Crear Usuario"}</h2>
      </div>

      {update && (
        <div>
          <label style={{ color: "gray" }}>Cédula</label>
          <Input
            placeholder="Escriba la cédula del usuario a buscar"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            onKeyDown={handleKeyDownOnSearchUser}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "10px" }}>
            <Button onClick={() => (redirect ? navigate(redirect) : navigate("/"))} type="default">
              Regresar
            </Button>
            <Button type="primary" onClick={handleSearchUser}>
              Buscar Usuario
            </Button>
          </div>
        </div>
      )}
      {(!update || (update && userToUpdate)) && (
        <>
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
              <Input
                disabled={update}
                status={ciStatus}
                placeholder="Cédula"
                value={ci}
                onChange={onChangeCI}
              />
            </div>

            <div>
              <label style={{ display: "block", color: getLabelColor(pnfStatus) }}>Programa</label>
              <Select
                value={pnfValue}
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
            <div>
              <Checkbox onChange={() => setSuperUser(!superUser)} checked={superUser}>
                <span style={{ color: "gray" }}>Super usuario</span>
              </Checkbox>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "30px" }}>
            {!update && (
              <Button onClick={() => (redirect ? navigate(redirect) : navigate("/"))} type="default">
                Regresar
              </Button>
            )}
            <Button onClick={handleCreateUser} type="primary">
              {update ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

