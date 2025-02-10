import { useState, useContext, useEffect } from "react";
import { Button, Modal, Select } from "antd";
import { FaWpforms, FaPrint } from "react-icons/fa";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Teacher } from "../../../interfaces/teacher";

interface SelectOption {
  label: string;
  value: string;
}

const trayectoOpt: SelectOption[] = [
  { label: "Trayecto 1", value: "1" },
  { label: "Trayecto 2", value: "2" },
  { label: "Trayecto 3", value: "3" },
];

const ReportProyection: React.FC = () => {
  const { pnfList, teachers } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>();
  const [trayectoOptions, _] = useState<SelectOption[]>(trayectoOpt);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string>("");
  const [selectedPnf, setSelectedPnf] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<Teacher | null>(null);
  useEffect(() => {
    if (!pnfList) return;
    setPnfOptions(pnfList.map((pnf) => ({ label: pnf.name, value: pnf.id.toString() })));
  }, [pnfList]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onChageTrayecto = (value: string) => {
    setSelectedTrayecto(value);
  };
  const onChangePnf = (value: string) => {
    setSelectedPnf(value);
  };

  useEffect(() => {
    if (!selectedPnf) return;
  }, [selectedTrayecto, selectedPnf]);

  const iconStyle = { color: "white", fontSize: "2rem" };
  return (
    <>
      <Button type="link" shape="circle" icon={<FaWpforms />} onClick={showModal} style={iconStyle} />

      <Modal
        width="100vw"
        height="100vh"
        title="Proyeciones"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div>
          <div
            style={{
              backgroundColor: "#001529",
              height: "70px",
              display: "flex",
              justifyContent: "space-evenly",
              alignItems: "center",
              padding: "10px",
              borderRadius: "10px",
            }}>
            <div style={{ width: "100%", maxWidth: "400px" }}>
              <span style={{ color: "white" }}>Programa</span>
              <Select style={{ width: "100%" }} onChange={onChangePnf} options={pnfOptions} />
            </div>

            <div style={{ width: "100%", maxWidth: "400px" }}>
              <span style={{ color: "white" }}>Trayecto</span>
              <Select style={{ width: "100%" }} onChange={onChageTrayecto} options={trayectoOptions} />
            </div>

            <Button type="link" shape="circle" icon={<FaPrint />} style={iconStyle} />
          </div>
        </div>

        <div></div>
      </Modal>
    </>
  );
};

export default ReportProyection;

