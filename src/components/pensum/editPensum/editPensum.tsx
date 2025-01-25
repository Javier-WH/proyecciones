import { Select, SelectProps, Button } from "antd";
import { useEffect, useState } from "react";
import getPnf from "../../../fetch/getPnf";
import getTrayectos from "../../../fetch/getTrayectos";
import getSubjects from "../../../fetch/getSubjects";
import {PNF} from "../../../interfaces/pnf";
import { Trayecto } from "../../../interfaces/trayecto";
import { SimpleSubject } from "../../../interfaces/subject";
import EditPensumTable from "./editPensumTable";
import "./editPensum.css"

export default function EditPensum() {

  const [pnfId, setPnfId] = useState<string | undefined>(undefined)
  const [pnfOpcions, setPnfOpcions] = useState<SelectProps["options"]>([]);

  const [trayectoId, setTrayectoId] = useState<string | undefined>(undefined)
  const [trayectoOpcions, setTrayectoOpcions] = useState<SelectProps["options"]>([]);

  const [subjectId, setSubjectId] = useState<string | undefined>(undefined)
  const [subjectOpcions, setSubjectOpcions] = useState<SelectProps["options"]>([]);

  


  useEffect(() => {
    async function fetchPnf() {
      const response = await getPnf()
      if(!response) return
      setPnfOpcions(response.map((pnf: PNF) => ({ value: pnf.id, label: pnf.name })))
    }
    fetchPnf()

    async function fetchTrayectos() {
      const response = await getTrayectos()
      if(!response) return
      setTrayectoOpcions(response.map((trayecto: Trayecto) => ({ value: trayecto.id, label: trayecto.name })))
    }
    fetchTrayectos()

    async function fetchSubjects() {
      const response = await getSubjects()
      if(!response) return
      setSubjectOpcions(response.map((subject: SimpleSubject) => ({ value: subject.id, label: subject.name })))
    }
    fetchSubjects()

  }, [])




  return <div>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem" }}>
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
        <Button type="primary">Agregar</Button>
      </div>

    </div>

    <EditPensumTable programaId={pnfId} trayectoId={trayectoId} />
  </div>
}