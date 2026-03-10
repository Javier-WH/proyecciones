import { Select, SelectProps, Button, message } from "antd";
import { useEffect, useState } from "react";
import getPnf from "../../../fetch/getPnf";
import getTrayectos from "../../../fetch/getTrayectos";
import getSubjects from "../../../fetch/getSubjects";
import { PNF } from "../../../interfaces/pnf";
import { Trayecto } from "../../../interfaces/trayecto";
import { SimpleSubject } from "../../../interfaces/subject";
import EditPensumTable from "./editPensumTable";
import postPensum from "../../../fetch/postPensum";
import getMaya from "../../../fetch/getMaya";
import "./editPensum.css";

export default function EditPensum() {
  const [pnfId, setPnfId] = useState<string | undefined>(undefined);
  const [pnfOpcions, setPnfOpcions] = useState<SelectProps["options"]>([]);
  const [pnfList, setPnfList] = useState<PNF[]>([]);

  const [trayectoId, setTrayectoId] = useState<string | undefined>(undefined);
  const [trayectoOpcions, setTrayectoOpcions] = useState<SelectProps["options"]>([]);

  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [subjectOpcions, setSubjectOpcions] = useState<SelectProps["options"]>([]);

  const [mayaId, setMayaId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchPnf() {
      const response = await getPnf();
      if (!response) return;
      const cleanPnfData = response.filter((pnf: { active: number }) => pnf.active === 1);
      setPnfList(cleanPnfData);
      setPnfOpcions(cleanPnfData.map((pnf: PNF) => ({ value: pnf.id, label: pnf.name })));
    }
    fetchPnf();

    async function fetchTrayectos() {
      const response = await getTrayectos();
      if (!response) return;
      setTrayectoOpcions(
        response.map((trayecto: Trayecto) => ({ value: trayecto.id, label: trayecto.name }))
      );
    }
    fetchTrayectos();

    async function fetchSubjects() {
      const response = await getSubjects();
      if (!response) return;
      const cleanSubjectData = response.filter((subject: SimpleSubject) => subject.active === 1);
      setSubjectOpcions(
        cleanSubjectData.map((subject: SimpleSubject) => ({ value: subject.id, label: subject.name }))
      );
    }
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!pnfId || pnfList.length === 0) {
      setMayaId(undefined);
      return;
    }

    const selectedPnf = pnfList.find((p) => p.id === pnfId);
    if (!selectedPnf) return;

    getMaya({ sagaPNFID: selectedPnf.saga_id.toString() }).then((data: any) => {
      const mayadata = data?.data?.mayas;
      if (!mayadata) return;
      const sortedMayas = mayadata.sort((a: any, b: any) => Number(b.id) - Number(a.id));
      const filteredMayas = sortedMayas.filter((maya: any) => maya.tipopensum_id === 1);
      if (filteredMayas.length > 0) {
        setMayaId(filteredMayas[0].id.toString());
      }
    });
  }, [pnfId, pnfList]);

  const handleAddSubject = async () => {
    if (!subjectId || !pnfId || !trayectoId) return;

    const requestData = {
      id: undefined,
      pnf_id: pnfId,
      subject_id: subjectId,
      trayecto_id: trayectoId,
      hours: "0",
      quarter: "[1,2,3]",
    };
    const response = await postPensum(requestData);

    if (response.error) {
      message.error(response.error);
      return;
    }

    // esto fuerza la actualizacion de la tabla
    const pnfStore = pnfId;
    setPnfId(undefined);
    setTimeout(() => {
      setPnfId(pnfStore);
      setSubjectId(undefined);
      message.success("Materia añadida correctamente");
    }, 50);
  };

  return (
    <div>
      <div
        className="title-bar-container"
        style={{ display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem" }}>
        <h1>Pensum</h1>
      </div>

      <div className="edit-pensum-selector-main-container">
        <div className="edit-pensum-selector-container">
          <label>Programa</label>
          <Select
            showSearch
            placeholder="Selecciona un programa"
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={pnfOpcions}
            value={pnfId}
            onChange={(value) => setPnfId(value)}
          />
        </div>

        <div className="edit-pensum-selector-container">
          <label>Trayecto</label>
          <Select
            showSearch
            placeholder="Selecciona un trayecto"
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={trayectoOpcions}
            value={trayectoId}
            onChange={(value) => setTrayectoId(value)}
          />
        </div>

        <div className="edit-pensum-selector-container">
          <label>Materia</label>
          <Select
            showSearch
            placeholder="Selecciona una materia"
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={subjectOpcions}
            value={subjectId}
            onChange={(value) => setSubjectId(value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <Button type="primary" disabled={!pnfId || !trayectoId || !subjectId} onClick={handleAddSubject}>
            Agregar
          </Button>
        </div>
      </div>

      <EditPensumTable programaId={pnfId} trayectoId={trayectoId} mayaId={mayaId} />
    </div>
  );
}
