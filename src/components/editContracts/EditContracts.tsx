import "../editTrayectos/EditTrayectos.css";
import { getContracts } from "../../fetch/contracts";
import { useEffect, useState } from "react";
import { TeacherContract } from "../../interfaces/teacher";
import { MdEditSquare } from "react-icons/md";
import { Button } from "antd";
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
    <div style={{ padding: "20px", width: "100%", height: "100%", overflowY: "auto" }}>
      <EditContractModal
        Contract={selectedContract}
        setSelectedContract={setSelectedContract}
        fetchContracts={fetchContracts}
      />
      <div
        className="title-bar-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}>
        <h1 style={{ margin: 0 }}>Gestión de Contratos</h1>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
        }}>
        {contracts.map((contract) => (
          <div
            key={contract.id}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #f0f0f0",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  color: "#262626",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  maxWidth: "80%",
                }}>
                {contract.contractType}
              </h3>
              <Button
                type="primary"
                shape="circle"
                icon={<MdEditSquare />}
                onClick={() => handleSelectedContract(contract)}
                style={{ flexShrink: 0 }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "#f9f9f9",
                padding: "12px",
                borderRadius: "8px",
              }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#e6f7ff",
                  color: "#1890ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}>
                H
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.85rem", color: "#8c8c8c" }}>Carga Horaria Semanal</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1f1f1f" }}>
                  {contract.hours} Horas
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

