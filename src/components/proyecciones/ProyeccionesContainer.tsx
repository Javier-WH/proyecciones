import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacher";
import "./proyeccionesContainer.css"
import { Button, Select, Radio } from 'antd';
import { GiSave } from "react-icons/gi";
import { RiFileExcel2Line } from "react-icons/ri";
import { MdOutlineRefresh } from "react-icons/md";
import { GiAutoRepair } from "react-icons/gi";
import { useContext, useEffect, useState } from "react";
import SubjectItem from "./SubjectItem/SubjectItem";
import useSubjectsInfo from "../../hooks/useSubjectsInfo";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { useNavigate } from "react-router-dom";


export default function ProyeccionesContainer() {

  const { tankenSubjects, aviableSubjects } = useSubjectsInfo();
  const [teacherTab, setTeacherTab] = useState(true);
  const [error, setError] = useState(false);
  const { setSelectedTeacerId, setSelectedTeacher, setSelectedQuarter, subjects } = useContext(MainContext) as MainContextValues

  const navigate = useNavigate()

  const iconStyle = { color: "white", fontSize: "2rem" }

  const handleChangeSelector = (value: string) => {
    console.log(`selected ${value}`);
  };
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
    if (!subjects) return
    setError(subjects.some(obj => Object.values(obj).some(value => value === null)))
  }, [subjects])

  if (error) {
    return <div className="proyecciones-container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "20px" }}>
      <h1>La proyección se ha creado con errores</h1>
      <Button
        style={{height: "60px", width: "300px", fontSize: "20px"}}
        type="primary"
        icon={<GiAutoRepair style={iconStyle} />}
        onClick={() => navigate("/app/proyecciones/subjects")}>
        Solucionar
      </Button> 
    </div>
  }

  return <div className="proyecciones-container" >

    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1>Proyección</h1>

      <Radio.Group defaultValue="a" size="small" onChange={(e) => handleChangeRadio(e.target.value)}>
        <Radio.Button value="a">Profesores</Radio.Button>
        <Radio.Button value="b">Materias</Radio.Button>
      </Radio.Group>

      <Select
        defaultValue="Inscripciones 2024"
        style={{ width: 300 }}
        options={[{ value: 'Inscripciones 2024', label: 'Inscripciones 2024' }]}
        onChange={handleChangeSelector}
      />

      <Select
        defaultValue="Primer Trimestre"
        style={{ width: 180 }}
        options={[
          { value: 'q1', label: 'Primer Trimestre' },
          { value: 'q2', label: 'Segundo Trimestre' },
          { value: 'q3', label: 'Tercer Trimestre' }
        ]}
        onChange={handleChangeQuarterSelector}
      />

      <div style={{ display: "flex", alignItems: "center", columnGap: "20px" }}>
        <Button type="link" shape="circle" icon={<GiSave />} style={iconStyle} />
        <Button type="link" shape="circle" icon={<RiFileExcel2Line />} style={iconStyle} />
        <Button type="link" shape="circle" icon={<MdOutlineRefresh />} style={iconStyle} />
      </div>

    </div>

    {
      teacherTab
        ?
        <>
          <TeacherTable />
          <SelectedTeacher />
        </>
        :
        <>
          <SubjectItem subjects={aviableSubjects} title="Asignaturas Disponibles" gridArea="table" />
          <SubjectItem subjects={tankenSubjects} title="Asignaturas Asignadas" gridArea="selected" />
        </>
    }


  </div>
}