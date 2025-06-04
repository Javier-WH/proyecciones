import { Button, Divider, message, Radio, RadioChangeEvent, Select } from "antd";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import getReport from "../../fetch/report";

const BUTTON_STYLE = {
  width: "200px",
  margin: "10px 0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "40px",
  fontSize: "16px",
  backgroundColor: "#1890ff",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

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
    if (!selectedPnf || !reportType) return;
    const report = await getReport({ pnfId: selectedPnf, type: reportType });
    if (!report.success) return message.error(report.message, 5);
  };

  return (
    <div className="admin-panel">
      <h1>Panel del Administrador del Sistema</h1>
      <p>Este es el panel de administración donde puedes gestionar la aplicación.</p>
      <Divider orientation="left">Usuarios</Divider>
      <div style={{ display: "flex", paddingLeft: "20px", gap: "20px" }}>
        <Button style={BUTTON_STYLE} type="primary" onClick={handleCreateUserClick}>
          Crear Usuario
        </Button>
        <Button style={BUTTON_STYLE} type="primary" onClick={handleUpdateUserClick}>
          Actualizar Usuario
        </Button>
      </div>
      <Divider orientation="left">Reportes</Divider>
      <div style={{ display: "flex", paddingLeft: "20px", gap: "20px", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "12px", color: "gray" }}>Programa</span>
          <Select
            defaultValue={userPNF}
            style={{ width: 300 }}
            onChange={handlePnfChange}
            options={pnfOptions}
            value={selectedPnf}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "12px", color: "gray" }}>Tipo de Reporte</span>
          <Select
            defaultValue={reportType.toString()}
            style={{ width: 300 }}
            onChange={(value) => setReportType(Number.parseInt(value))}
            options={[
              { value: "1", label: "Trimestral" },
              { value: "2", label: "Anual" },
            ]}
            value={reportType.toString()}
          />
        </div>
        <Button style={BUTTON_STYLE} type="primary" onClick={generateReport}>
          Generar
        </Button>
      </div>
    </div>
  );
}

