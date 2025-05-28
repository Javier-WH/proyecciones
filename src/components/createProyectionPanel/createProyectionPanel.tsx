import { message, Select, SelectProps } from "antd";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import TabPanel from "./tabPanel/tabPanel";

export default function CreateProyectionPanel() {
  const { pnfList, trayectosList, userPNF, userData } = useContext(MainContext) as MainContextValues;
  const [pnfOptions, setPnfOptions] = useState<SelectProps["options"] | []>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | null>(userPNF);
  const [trayectoOptions, setTrayectoOptions] = useState<SelectProps["options"] | []>([]);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string | null>(null);

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

  const handlePnfChange = (value: string) => {
    setSelectedPnf(value);
  };
  const handleTrayectoChange = (value: string) => {
    setSelectedTrayecto(value);
  };
  return (
    <div style={{ width: "100%", height: "100%", padding: "20px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          columnGap: "20px",
          marginBottom: "20px",
        }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}>
          <label style={{ color: "gray", fontSize: "12px" }}>Programa</label>
          <Select
            defaultValue={userPNF}
            style={{ width: 300 }}
            onChange={handlePnfChange}
            options={pnfOptions}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}>
          <label style={{ color: "gray", fontSize: "12px" }}>Trayecto</label>
          <Select
            placeholder="Selecciona un trayecto"
            style={{ width: 300 }}
            onChange={handleTrayectoChange}
            options={trayectoOptions}
          />
        </div>
      </div>
      <TabPanel selectedPnf={selectedPnf} selectedTrayecto={selectedTrayecto} />
    </div>
  );
}

