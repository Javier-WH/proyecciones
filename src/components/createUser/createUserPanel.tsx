import { Input, Select, Button, message, Checkbox, Modal, Card, Row, Col, Divider, Typography, Form } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, UserOutlined, SearchOutlined, SaveOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useState, useContext, useEffect } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import postUser from "../../fetch/postUser";
import getUser from "../../fetch/getUser";
import putUser from "../../fetch/putUser";
import deleteUser from "../../fetch/deleteUser";
import { useNavigate, useLocation } from "react-router-dom";

const { Title, Text } = Typography;

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
  const { pnfList, userData, setUserData, setUserPNF } = useContext(MainContext) as MainContextValues;
  const navigate = useNavigate();

  // States
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

  // Handlers
  const onChangeNames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNameStatus(value === "" ? "error" : "");
    setName(value);
  };

  const onChangeLastNames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLastNameStatus(value === "" ? "error" : "");
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
    setUserStatus(value === "" ? "error" : "");
    setUser(value);
  };

  const onChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // For Update: Empty is allowed (no error)
    // For Create: Empty is error
    if (!update && value === "") {
      setPasswordStatus("error");
    } else {
      setPasswordStatus("");
    }
    setPassword(value);
  };

  const onChangeConfirmPassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);

    // Check match immediately
    if (update && password === "" && value === "") {
      setConfirmPasswordStatus("");
      return;
    }

    if (value === "" && (!update || password !== "")) {
      setConfirmPasswordStatus("error");
    } else if (password !== value) {
      setConfirmPasswordStatus("warning");
    } else {
      setConfirmPasswordStatus("");
    }
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
        setUserToUpdate(res);
        setName(res.name);
        setLastName(res.last_name);
        setCi(res.ci);
        setUser(res.user);
        setPnfValue(res.pnf_id);
        setSuperUser(res.su);
        // Clear passwords on load
        setPassword("");
        setConfirmPassword("");
        // Reset statuses
        resetStatuses();
      })
      .catch((error) => {
        message.error("Error al buscar el usuario: " + error);
      });
  };

  const resetStatuses = () => {
    setNameStatus("");
    setLastNameStatus("");
    setCiStatus("");
    setUserStatus("");
    setPasswordStatus("");
    setConfirmPasswordStatus("");
    setPnfStatus("");
  };

  const handleCreateUser = () => {
    // Basic validation
    let hasError = false;

    if (name === "") { setNameStatus("error"); hasError = true; }
    if (lastName === "") { setLastNameStatus("error"); hasError = true; }
    if (ci === "") { setCiStatus("error"); hasError = true; }
    if (user === "") { setUserStatus("error"); hasError = true; }
    if (pnfValue === null) { setPnfStatus("error"); hasError = true; }

    // Password validation logic
    if (update) {
      // If updating, password is optional, BUT if typed, must match
      if (password !== "" || confirmPassword !== "") {
        if (password !== confirmPassword) {
          message.error("Las contraseñas no coinciden");
          setConfirmPasswordStatus("error");
          return;
        }
      }
    } else {
      // Creating new user
      if (password === "") { setPasswordStatus("error"); hasError = true; }
      if (confirmPassword === "") { setConfirmPasswordStatus("error"); hasError = true; }
      if (password !== confirmPassword) {
        message.error("Las contraseñas no coinciden");
        return;
      }
    }

    if (hasError) {
      message.error("Por favor complete los campos obligatorios");
      return;
    }

    if (!digitsOnlyRegex.test(ci)) {
      message.error("La cédula debe ser un número");
      return;
    }

    const data = {
      name,
      last_name: lastName,
      ci,
      user,
      password, // If empty string, backend ignores it
      su: superUser,
      pnf_id: pnfValue ?? "",
    };

    if (update && userToUpdate) {
      putUser(data)
        .then((res) => {
          if (res.error) {
            message.error(res.error);
            return;
          }
          message.success("Usuario actualizado correctamente");

          if (userData && userData.ci === userToUpdate.ci) {
            setUserData({
              ...userData,
              name: data.name,
              su: data.su,
              ci: data.ci
            });
            setUserPNF(data.pnf_id);
          }

          if (redirect) {
            navigate(redirect);
          } else {
            navigate("/");
          }
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
        } else {
          navigate("/");
        }
      })
      .catch((error) => {
        message.error("Error al crear el usuario " + error);
      });
  };

  const handleKeyDownOnSearchUser = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchUser();
    }
    // Only clear if meaningful change intended? keeping logic simple
    if (userToUpdate && e.currentTarget.value !== searchUser) {
      setUserToUpdate(null);
    }
  };

  const handleDeleteUser = () => {
    if (!userToUpdate) return;
    let confirmInput = "";
    Modal.confirm({
      title: 'Confirmar eliminación',
      content: (
        <div>
          <p>Para confirmar la eliminación del usuario <b>{userToUpdate.user}</b> con cédula <b>{userToUpdate.ci}</b>, por favor escriba <b>ELIMINAR</b> en el siguiente campo:</p>
          <Input placeholder="Escriba ELIMINAR para confirmar" onChange={(e) => (confirmInput = e.target.value)} />
        </div>
      ),
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk() {
        if (confirmInput === "ELIMINAR") {
          deleteUser(userToUpdate)
            .then((res) => {
              if (res.error) {
                message.error(res.error);
                return;
              }
              message.success("Usuario eliminado correctamente");
              navigate(redirect || "/");
            })
            .catch((error) => message.error("Error al eliminar: " + error));
        } else {
          message.error("Confirmación incorrecta.");
        }
      },
      onCancel() { message.info("Eliminación cancelada."); },
    });
  };

  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <Card
        style={{ width: "100%", maxWidth: "900px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>{update ? "Actualizar Usuario" : "Crear Nuevo Usuario"}</Title>
          </div>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(redirect || "/")}>
            Volver
          </Button>
        }
      >
        {update && (
          <div style={{ marginBottom: "24px", padding: "20px", background: "#fafafa", borderRadius: "8px", border: "1px solid #d9d9d9" }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Buscar Usuario Existente</Text>
            <div style={{ display: "flex", gap: "12px" }}>
              <Input
                prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="Ingrese la Cédula (CI)"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                onKeyDown={handleKeyDownOnSearchUser}
                size="large"
              />
              <Button type="primary" size="large" onClick={handleSearchUser} icon={<SearchOutlined />}>
                Buscar
              </Button>
            </div>
          </div>
        )}

        {(!update || (update && userToUpdate)) && (
          <Form layout="vertical" size="large">
            <Divider orientation="left">Información Personal</Divider>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item label="Nombres" validateStatus={nameStatus} help={nameStatus === "error" ? "Campo obligatorio" : null}>
                  <Input placeholder="Ej. Juan Andrés" value={name} onChange={onChangeNames} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Apellidos" validateStatus={lastNameStatus} help={lastNameStatus === "error" ? "Campo obligatorio" : null}>
                  <Input placeholder="Ej. Pérez López" value={lastName} onChange={onChangeLastNames} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item label="Cédula de Identidad" validateStatus={ciStatus} help={ciStatus === "error" ? "Debe ser numérico y obligatorio" : null}>
                  <Input placeholder="Ej. 12345678" value={ci} onChange={onChangeCI} disabled={update} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Programa Nacional de Formación (PNF)" validateStatus={pnfStatus} help={pnfStatus === "error" ? "Seleccione una opción" : null}>
                  <Select
                    placeholder="Seleccione un programa"
                    value={pnfValue}
                    onChange={handlePNFChange}
                    options={pnfOptions}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Datos de Cuenta</Divider>
            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item label="Nombre de Usuario" validateStatus={userStatus} help={userStatus === "error" ? "Campo obligatorio" : null}>
                  <Input prefix={<UserOutlined />} placeholder="usuario.sistema" value={user} onChange={onChangeUser} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={update ? "Contraseña (Opcional)" : "Contraseña"}
                  validateStatus={passwordStatus}
                  help={passwordStatus === "error" ? "Campo obligatorio" : (update ? "Dejar en blanco para conservar la actual" : null)}
                >
                  <Input.Password
                    placeholder={update ? "Sin cambios" : "********"}
                    value={password}
                    onChange={onChangePassword}
                    iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Confirmar Contraseña"
                  validateStatus={confirmPasswordStatus}
                  help={confirmPasswordStatus === "error" ? "No coinciden" : null}
                >
                  <Input.Password
                    placeholder={update ? "Sin cambios" : "********"}
                    value={confirmPassword}
                    onChange={onChangeConfirmPassword}
                    onBlur={onBlurConfirmPassword}
                    iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Form.Item>
                  <Checkbox checked={superUser} onChange={() => setSuperUser(!superUser)} style={{ fontSize: '16px' }}>
                    Conceder permisos de <b>Administrador</b> (Super Usuario)
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {update && (
                <Button danger type="primary" icon={<DeleteOutlined />} size="large" onClick={handleDeleteUser}>
                  Eliminar Usuario
                </Button>
              )}
              <Button type="primary" icon={<SaveOutlined />} size="large" onClick={handleCreateUser} style={{ minWidth: '150px' }}>
                {update ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </div>

          </Form>
        )}
      </Card>
    </div>
  );
}