import "./proyeccionesSubjects.css";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Button, Select } from "antd";
import TablePensum from "./table/table";
import { GiAutoRepair } from "react-icons/gi";
import { useNavigate } from "react-router-dom";
import { Subject } from "../../interfaces/subject";

interface SelectOption {
  value: string;
  label: string;
}

export default function ProyeccionesSubjects() {
  const { subjects, proyectionsDone } = useContext(MainContext) as MainContextValues;
  const navigate = useNavigate();
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | undefined>(undefined);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);
  const [trayectoOptions, setTrayectoOptions] = useState<SelectOption[]>([]);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!subjects) return;

    // opciones para el select de PNF
    const uniquePnf = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.pnfId === subject.pnfId)
    );

    const pnfList = uniquePnf?.map((subject) => {
      return {
        value: subject.pnfId,
        label: subject.pnf,
      };
    });
    setPnfOptions(pnfList as SelectOption[]);

    // opcones para el select de materias
    const uniqueSubject = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.subject === subject.subject)
    );

    const subjectList = uniqueSubject?.map((subject) => {
      return {
        value: subject.subject,
        label: subject.subject,
      };
    });
    setSubjectOptions(subjectList as SelectOption[]);

    // opciones para el select de trayectos
    const uniqueTrayecto = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.trayectoId === subject.trayectoId)
    );
    const trayectoList = uniqueTrayecto?.map((subject) => {
      return {
        value: subject.trayectoId,
        label: subject.trayectoName,
      };
    });
    setTrayectoOptions(trayectoList as SelectOption[]);

    // lista de materias
    setFilteredSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    if (!subjects) return;

    let filteredSubjectsCopy = [...subjects];
    // filtrdo por pnf
    if (selectedPnf) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter((subject) => subject.pnfId === selectedPnf);
    }

    // filtrado por materia
    if (selectedSubject) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter((subject) => subject.subject === selectedSubject);
    }

    // filtrado por trayecto
    if (selectedTrayecto) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter(
        (subject) => subject.trayectoId === selectedTrayecto
      );
    }

    setFilteredSubjects(filteredSubjectsCopy as Subject[]);
  }, [selectedPnf, selectedSubject, selectedTrayecto, subjects]);

  const iconStyle = { color: "white", fontSize: "2rem" };
  // si no hay proyecciones
  if (subjects?.length === 0 && proyectionsDone?.length === 0) {
    return (
      <div
        className="proyecciones-container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
        }}>
        <h1>No se ha encontrado ninguna proyección</h1>
        <Button
          style={{ height: "60px", width: "300px", fontSize: "20px" }}
          type="primary"
          icon={<GiAutoRepair style={iconStyle} />}
          onClick={() => navigate("/app/proyecciones/create")}>
          Crear proyección
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          columnGap: "3rem",
        }}>
        <h1>Materias en la Proyección</h1>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
          marginTop: "20px",
        }}>
        <Select
          allowClear
          showSearch
          style={{ width: 200 }}
          placeholder="Filtrar por PNF"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={pnfOptions}
          onChange={(value) => {
            setSelectedPnf(value);
          }}
          value={selectedPnf}
        />

        <Select
          allowClear
          showSearch
          style={{ width: 200 }}
          placeholder="Filtrar por materia"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={subjectOptions}
          onChange={(value) => {
            setSelectedSubject(value);
          }}
          value={selectedSubject}
        />

        <Select
          allowClear
          showSearch
          style={{ width: 200 }}
          placeholder="Filtrar por trayecto"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={trayectoOptions}
          onChange={(value) => {
            setSelectedTrayecto(value);
          }}
          value={selectedTrayecto}
        />
      </div>

      <TablePensum subjects={filteredSubjects} />
    </>
  );
}

