import { Modal, Input, InputNumber, message } from "antd";
import { TeacherContract } from "../../interfaces/teacher";
import { useEffect, useState } from "react";
import { putContract } from "../../fetch/contracts";

export default function EditContractModal({
  Contract,
  setSelectedContract,
  fetchContracts,
}: {
  Contract: TeacherContract | null;
  setSelectedContract: (trayecto: TeacherContract | null) => void;
  fetchContracts: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractName, setContractName] = useState<string>("");
  const [contractHours, setContractHours] = useState<number>(0);

  useEffect(() => {
    if (Contract) {
      setIsModalOpen(true);
      setContractName(Contract.contractType);
      setContractHours(Contract.hours);
    } else {
      setIsModalOpen(false);
      setContractName("");
      setContractHours(0);
    }
  }, [Contract]);

  const handleCancel = () => {
    setSelectedContract(null);
  };

  const handleOk = async () => {
    if (!Contract) return;
    const response = await putContract({ id: Contract.id, contractType: contractName, hours: contractHours });
    if (response.error) {
      message.error(response.error);
      return;
    }

    if (response) {
      fetchContracts();
      handleCancel();
      message.success("Contrato editado correctamente");
    }
  };

  return (
    <Modal title="Edición de Contrato" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
      <div>
        <span className="trayecto-modal-trayectoID">{`id: ${Contract?.id}`}</span>
        <div className="trayecto-modal-input-container">
          <label htmlFor="">Nombre del contrato</label>
          <Input
            placeholder="escriba un nombre para el contrato"
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
          />
        </div>
        <div className="trayecto-modal-input-container">
          <label htmlFor="">Horas</label>
          <InputNumber min={0} max={100} value={contractHours} onChange={(e) => setContractHours(e ?? 0)} />
        </div>
      </div>
    </Modal>
  );
}

