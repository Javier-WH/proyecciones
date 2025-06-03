import { useEffect, useState } from "react";
import getPnf from "../../../fetch/getPnf";
import { PNF } from "../../../interfaces/pnf";
import { Button, Popconfirm, message } from "antd";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import EditPNFModal from "./editPNFModal";
import deletePnf from "../../../fetch/deletePNF";
export default function EditPNF() {
  const [pnfList, setPnfList] = useState<PNF[]>([]);
  const [activePNF, setActivePNF] = useState<PNF | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchPnf() {
    const response = await getPnf();
    if (!response) return;
    setPnfList(response);
  }

  useEffect(() => {
    fetchPnf();
  }, []);

  const handleDeletePNF = async (pnf: PNF) => {
    if (!pnf) return;
    const id = pnf.id;
    const response = await deletePnf({ id });
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success(response.message);
    fetchPnf();
  };

  return (
    <div>
      <EditPNFModal
        programa={activePNF}
        setprograma={setActivePNF}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        fetchPnf={fetchPnf}
      />
      <div
        className="title-bar-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <h1>Editar Programas</h1>
      </div>
      <div style={{ width: "80%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {pnfList.map((PNF) => {
          return (
            <div
              key={PNF.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 10px",
                margin: "5px 5px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "1.1em",
              }}
              className="trayecto-card">
              <span>{PNF.name}</span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  columnGap: "10px",
                }}>
                <Button type="primary" shape="circle" icon={<FiEdit2 />} onClick={() => setActivePNF(PNF)} />
                <Popconfirm
                  title="¿Estas seguro que deseas eliminar este PNF?"
                  description="Esta operacion NO se puede deshacer"
                  onConfirm={() => handleDeletePNF(PNF)}
                  //onCancel={cancel}
                  okText="Si"
                  cancelText="No">
                  <Button type="primary" shape="circle" icon={<FiTrash2 />} danger />
                </Popconfirm>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          width: "80%",
          display: "flex",
          justifyContent: "right",
          marginTop: "20px",
        }}>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Agregar Programa
        </Button>
      </div>
    </div>
  );
}

