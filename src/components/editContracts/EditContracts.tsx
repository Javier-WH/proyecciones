import "../editTrayectos/EditTrayectos.css";
import { getContracts, putContract, ContractTypeType } from "../../fetch/contracts";
import { useEffect, useState } from "react";
import { TeacherContract } from "../../interfaces/teacher";
import { MdEditSquare } from "react-icons/md";
import { Button, Tag } from "antd";
import EditContractModal from "./EditContractModal";

export default function EditContracts() {
  const [contracts, setContracts] = useState<TeacherContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<TeacherContract | null>(null);

  const fetchContracts = async () => {
    const response = await getContracts();
    if (response?.error) {
      console.error(response.error);
      return [];
    }
    setContracts(response);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleSelectedContract = (contract: TeacherContract) => {
    setSelectedContract(contract);
  };

  return (
    <>
      <EditContractModal
        Contract={selectedContract}
        setSelectedContract={setSelectedContract}
        fetchContracts={fetchContracts}
      />
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <h1>Contratos</h1>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "20px",
        }}>
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="contract-card"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
            }}>
            <Tag>Tipo de contrato: {contract.contractType}</Tag>
            <Tag>Horas: {contract.hours}</Tag>
            <Button
              type="primary"
              shape="circle"
              icon={<MdEditSquare />}
              onClick={() => handleSelectedContract(contract)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

