import { Button, Divider, message, Select, Card, Row, Col, Typography, Modal, Table, Tag } from "antd";
import { UserAddOutlined, EditOutlined, FilePdfOutlined, SafetyCertificateOutlined, TeamOutlined, CloudDownloadOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import getReport from "../../fetch/report";
import getUsers from "../../fetch/getUsers";

const { Title, Text, Paragraph } = Typography;

interface PnfMaskOptions {
  value: string;
  label: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { pnfList, userPNF } = useContext(MainContext) as MainContextValues;
  const [pnfOptions, setPnfOptions] = useState<PnfMaskOptions[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | undefined>(undefined);
  const [reportType, setReportType] = useState<number>(1);

  // User list state
  const [isUserListVisible, setIsUserListVisible] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (userPNF) setSelectedPnf(userPNF);
  }, [userPNF]);

  useEffect(() => {
    if (!pnfList) return;
    const pnfOpt = pnfList.map((pnf) => ({
      value: pnf.id.toString(),
      label: pnf.name.toString(),
    }));
    setPnfOptions(pnfOpt);
  }, [pnfList]);

  const handleCreateUserClick = () => {
    navigate("/app/singin", { state: { redirect: "/app/admin" } });
  };

  const handleUpdateUserClick = () => {
    navigate("/app/singin", { state: { redirect: "/app/admin", update: true } });
  };

  const handlePnfChange = (value: string) => {
    setSelectedPnf(value);
  };

  const generateReport = async () => {
    if (!selectedPnf || !reportType) {
      message.warning("Seleccione un Programa y un Tipo de Reporte");
      return;
    }
    const report = await getReport({ pnfId: selectedPnf, type: reportType });
    if (!report.success) return message.error(report.message, 5);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        message.error("Error al cargar los usuarios");
      }
    } catch (error) {
      message.error("Error de conexión al obtener usuarios");
    } finally {
      setLoadingUsers(false);
    }
  };

  const showUserList = () => {
    setIsUserListVisible(true);
    fetchUsers();
  };

  const userColumns = [
    {
      title: 'Nombre Completo',
      key: 'fullName',
      render: (record: any) => `${record.name} ${record.last_name}`,
    },
    {
      title: 'Cédula',
      dataIndex: 'ci',
      key: 'ci',
    },
    {
      title: 'Usuario',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Nivel de Permiso',
      dataIndex: 'su',
      key: 'su',
      render: (su: boolean) => (
        <Tag color={su ? "gold" : "blue"}>
          {su ? "Super Administrador" : "Usuario Regular"}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <Title level={2} style={{ marginBottom: 0 }}>
            <SafetyCertificateOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Panel de Administración
          </Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', marginTop: '8px' }}>
            Gestión de usuarios y generación de reportes académicos
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {/* Section: User Management */}
          <Col xs={24} md={12}>
            <Card
              title={<span><TeamOutlined style={{ marginRight: 8, color: '#1890ff' }} /> Gestión de Usuarios</span>}
              bordered={false}
              hoverable
              style={{ height: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', height: '100%', padding: '0' }}>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserAddOutlined />}
                    onClick={handleCreateUserClick}
                    style={{ height: '45px', fontSize: '16px' }}
                  >
                    Crear Nuevo Usuario
                  </Button>
                  <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: '13px' }}>
                    Registre nuevos profesores o administradores.
                  </Paragraph>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <Button
                    size="large"
                    icon={<EditOutlined />}
                    onClick={handleUpdateUserClick}
                    style={{ height: '45px', fontSize: '16px' }}
                  >
                    Actualizar Usuario Existente
                  </Button>
                  <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: '13px' }}>
                    Modifique datos de usuarios registrados.
                  </Paragraph>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <Button
                    size="large"
                    icon={<UnorderedListOutlined />}
                    onClick={showUserList}
                    style={{ height: '45px', fontSize: '16px', borderStyle: 'dashed' }}
                  >
                    Ver Lista de Usuarios
                  </Button>
                  <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: '13px' }}>
                    Visualice todos los usuarios y sus niveles de acceso.
                  </Paragraph>
                </div>
              </div>
            </Card>
          </Col>

          {/* Section: Reports */}
          <Col xs={24} md={12}>
            <Card
              title={<span><FilePdfOutlined style={{ marginRight: 8, color: '#faad14' }} /> Generación de Reportes</span>}
              bordered={false}
              hoverable
              style={{ height: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                <Paragraph>
                  Seleccione el programa y el formato para descargar los reportes de proyección académica.
                </Paragraph>

                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>Programa Nacional de Formación (PNF)</Text>
                  <Select
                    placeholder="Seleccione un programa"
                    style={{ width: "100%" }}
                    size="large"
                    onChange={handlePnfChange}
                    options={pnfOptions}
                    value={selectedPnf}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>

                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>Tipo de Reporte</Text>
                  <Select
                    defaultValue={reportType.toString()}
                    style={{ width: "100%" }}
                    size="large"
                    onChange={(value) => setReportType(Number.parseInt(value))}
                    options={[
                      { value: "1", label: "Reporte Trimestral (Detallado)" },
                      { value: "2", label: "Reporte Anual (Resumen)" },
                    ]}
                    value={reportType.toString()}
                  />
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<CloudDownloadOutlined />}
                  onClick={generateReport}
                  style={{ marginTop: '12px', height: '50px', backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  block
                >
                  Generar y Descargar Reporte
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title={<span><TeamOutlined style={{ marginRight: 8 }} /> Lista de Usuarios del Sistema</span>}
        open={isUserListVisible}
        onCancel={() => setIsUserListVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsUserListVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={800}
      >
        <Table
          columns={userColumns}
          dataSource={users}
          loading={loadingUsers}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          size="middle"
        />
      </Modal>
    </div>
  );
}

