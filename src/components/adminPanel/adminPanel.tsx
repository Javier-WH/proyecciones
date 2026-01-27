import { Button, Divider, message, Select, Card, Row, Col, Typography } from "antd";
import { UserAddOutlined, EditOutlined, FilePdfOutlined, SafetyCertificateOutlined, TeamOutlined, CloudDownloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import getReport from "../../fetch/report";

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '100%', padding: '10px 0' }}>
                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserAddOutlined />}
                    onClick={handleCreateUserClick}
                    style={{ height: '50px', fontSize: '16px' }}
                  >
                    Crear Nuevo Usuario
                  </Button>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Registre nuevos profesores, administradores o personal de apoyo en el sistema.
                  </Paragraph>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                  <Button
                    size="large"
                    icon={<EditOutlined />}
                    onClick={handleUpdateUserClick}
                    style={{ height: '50px', fontSize: '16px' }}
                  >
                    Actualizar Usuario Existente
                  </Button>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Modifique datos personales, roles o contraseñas de usuarios registrados.
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
    </div>
  );
}

