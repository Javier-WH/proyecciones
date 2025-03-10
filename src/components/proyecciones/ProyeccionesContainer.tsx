import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacher";
import "./proyeccionesContainer.css";
import { Button, Select, Radio } from "antd";
import { GiAutoRepair } from "react-icons/gi";
import { useContext, useEffect, useState } from "react";
import SubjectItem from "./SubjectItem/SubjectItem";
import SubjectItemAsigned from "./SubjectItem/SubjectItemAsigned";
import useSubjectsInfo from "../../hooks/useSubjectsInfo";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { useNavigate } from "react-router-dom";
//import Excel from "../reports/excel";
//import ReportProyection from "../reports/report/reportProyection";
import { LogoutOutlined } from "@ant-design/icons";
import ReportMenu from "./reportMenu/reportMenu";

export default function ProyeccionesContainer() {
  const { tankenSubjects, aviableSubjects } = useSubjectsInfo();
  const [teacherTab, setTeacherTab] = useState(true);
  const [error, setError] = useState(false);
  const [searchByUserPerfil, setSearchByUserPerfil] = useState<boolean>(true);
  const {
    setSelectedTeacerId,
    setSelectedTeacher,
    setSelectedQuarter,
    subjects,
    proyectionsDone,
    selectedQuarter,
    proyectionName,
    setIsAuthenticated,
  } = useContext(MainContext) as MainContextValues;

  const navigate = useNavigate();

  const iconStyle = { color: "white", fontSize: "2rem" };

  const handleChangeQuarterSelector = (value: string) => {
    setSelectedQuarter(value as "q1" | "q2" | "q3");
  };

  const handleChangeRadio = (value: string) => {
    //profesores = a, materias = b
    setTeacherTab(value === "a");
    //se deben colocar en null para prevenir posible bugs
    setSelectedTeacerId(null);
    setSelectedTeacher(null);
  };

  //aqui se revisa si existe algun valor null en la tabla subjects
  useEffect(() => {
    if (!subjects) return;
    setError(
      subjects.some((obj) => Object.values(obj).some((value) => value === null)) ||
        subjects.some((subjec) => subjec.hours <= 0)
    );
  }, [subjects]);

  if (error) {
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
        <h1>La proyección se ha creado con errores</h1>
        <Button
          style={{ height: "60px", width: "300px", fontSize: "20px" }}
          type="primary"
          icon={<GiAutoRepair style={iconStyle} />}
          onClick={() => navigate("/app/proyecciones/subjects")}>
          Solucionar
        </Button>
      </div>
    );
  }

  // si no hay materias y no hay proyecciones hechas
  if (subjects?.length === 0 && proyectionsDone.length === 0) {
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

  const onChageSearchByUserPerfil = (value: boolean) => {
    setSearchByUserPerfil(value);
  };

  return (
    <div className="proyecciones-container">
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <h1>Proyección</h1>

        <Radio.Group defaultValue="a" size="small" onChange={(e) => handleChangeRadio(e.target.value)}>
          <Radio.Button value="a">Profesores</Radio.Button>
          <Radio.Button value="b">Materias</Radio.Button>
        </Radio.Group>

        {teacherTab && (
          <Radio.Group
            defaultValue={true}
            size="small"
            onChange={(e) => onChageSearchByUserPerfil(e.target.value)}>
            <Radio.Button value={true}>Mis profesores</Radio.Button>
            <Radio.Button value={false}>Todos los profesores</Radio.Button>
          </Radio.Group>
        )}

        <span>{proyectionName}</span>

        <Select
          defaultValue="Primer Trimestre"
          value={selectedQuarter}
          style={{ width: 180 }}
          options={[
            { value: "q1", label: "Primer Trimestre" },
            { value: "q2", label: "Segundo Trimestre" },
            { value: "q3", label: "Tercer Trimestre" },
          ]}
          onChange={handleChangeQuarterSelector}
        />
        <div style={{ display: "flex", gap: "5px" }}>
          {/*<Excel /> */}
          {/*<ReportProyection />*/}
          <ReportMenu />
          <Button
            style={{ marginLeft: "30px" }}
            type="link"
            icon={<LogoutOutlined />}
            onClick={() => setIsAuthenticated(false)}
          />
        </div>
      </div>

      {teacherTab ? (
        <>
          <TeacherTable searchByUserPerfil={searchByUserPerfil} />
          <SelectedTeacher />
        </>
      ) : (
        <>
          <div className="subjects-list-container-grid">
            <SubjectItem subjects={aviableSubjects} title="Asignaturas Disponibles" />
            <SubjectItemAsigned subjects={tankenSubjects} title="Asignaturas Asignadas" />
          </div>
        </>
      )}
    </div>
  );
}

