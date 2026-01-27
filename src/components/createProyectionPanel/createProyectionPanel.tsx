/* eslint-disable react-hooks/exhaustive-deps */
import { Select, SelectProps, Card, Typography, Row, Col, Space } from "antd";
import { ProjectOutlined, BookOutlined, CalendarOutlined, DeploymentUnitOutlined } from "@ant-design/icons";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import getMaya from "../../fetch/getMaya";
import TabPanel from "./tabPanel/tabPanel";

const { Title, Text } = Typography;

export default function CreateProyectionPanel() {
  const { pnfList, trayectosList, userPNF, userData } = useContext(MainContext) as MainContextValues;
  const [pnfOptions, setPnfOptions] = useState<SelectProps["options"] | []>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | null>(userPNF);
  const [trayectoOptions, setTrayectoOptions] = useState<SelectProps["options"] | []>([]);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string | null>(null);
  const [mayaOptions, setMayaOptions] = useState<NonNullable<SelectProps["options"]>>([]);
  const [selectedMaya, setSelectedMaya] = useState<string | null>(null);
  const [loadingMaya, setLoadingMaya] = useState<boolean>(false);


  // llena las opciones de pnf y trayecto
  useEffect(() => {
    if (!pnfList || !trayectosList) return;

    const pnfOpt = pnfList.map((pnf) => ({
      value: pnf.id.toString(),
      label: pnf.name.toString(),
      disabled: !userData?.su && pnf.id.toString() !== userPNF,
    }));
    const trayectoOpt = trayectosList.map((trayecto) => ({
      value: trayecto.id.toString(),
      label: trayecto.name.toString(),
      order: trayecto.order,
    }));
    setPnfOptions(pnfOpt);
    setTrayectoOptions(trayectoOpt.sort((a, b) => a.order - b.order));
  }, [pnfList, trayectosList]);


  useEffect(() => {
    if (!selectedPnf) return;
    const sagaPNFID = pnfList?.find((pnf) => pnf.id.toString() === selectedPnf)?.saga_id?.toString();
    if (!sagaPNFID) return;

    setLoadingMaya(true);
    setSelectedMaya(null);
    setMayaOptions([]);

    getMaya({ sagaPNFID }).then((data) => {
      const mayadata = data?.data?.mayas;
      if (!mayadata) return;

      const sortedMayas = mayadata.sort((a: any, b: any) => Number(b.id) - Number(a.id));

      const filteredMayas = sortedMayas.filter((maya: any) => maya.tipopensum_id === 1); // solo las que no son de prosecicion

      const mayaOpt = filteredMayas.map((maya: { id: { toString: () => any; }; descripcion: { toString: () => any; }; }) => ({
        value: maya.id.toString(),
        label: maya.descripcion.toString(),
      }));


      setMayaOptions(mayaOpt);
      if (mayaOpt.length > 0) {
        setSelectedMaya(mayaOpt[0].value);
      }
    }).finally(() => {
      setLoadingMaya(false);
    });
  }, [selectedPnf]);

  const handleMayaChange = (value: string) => {
    setSelectedMaya(value);
  };

  const handlePnfChange = (value: string) => {
    setSelectedPnf(value);
  };
  const handleTrayectoChange = (value: string) => {
    setSelectedTrayecto(value);
  };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ProjectOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>Crear Proyección Académica</Title>
        </div>

        <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)', marginBottom: '24px' }}>
          <Row gutter={[24, 24]} align="bottom">
            <Col xs={24} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary"><BookOutlined /> Programa Nacional de Formación (PNF)</Text>
                <Select
                  defaultValue={userPNF}
                  style={{ width: "100%" }}
                  onChange={handlePnfChange}
                  options={pnfOptions}
                  size="large"
                />
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary"><CalendarOutlined /> Trayecto</Text>
                <Select
                  placeholder="Selecciona un trayecto"
                  style={{ width: "100%" }}
                  onChange={handleTrayectoChange}
                  options={trayectoOptions}
                  size="large"
                />
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary"><DeploymentUnitOutlined /> Malla Curricular</Text>
                <Select
                  placeholder="Selecciona una maya"
                  style={{ width: "100%" }}
                  value={selectedMaya}
                  loading={loadingMaya}
                  disabled={loadingMaya}
                  onChange={handleMayaChange}
                  options={mayaOptions}
                  size="large"
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {mayaOptions?.length > 0 && selectedTrayecto && selectedMaya ? (
          <div style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <TabPanel selectedPnf={selectedPnf} selectedTrayecto={selectedTrayecto} selectedMaya={selectedMaya} />
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: "50px", color: "#999" }}>
            <p>Seleccione todos los campos requeridos para configurar la proyección.</p>
          </div>
        )}
      </div>
    </div>
  );
}

