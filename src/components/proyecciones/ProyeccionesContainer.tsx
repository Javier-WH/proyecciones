import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacher";
import "./proyeccionesContainer.css"
import { Button, Select, Radio} from 'antd';
import { GiSave } from "react-icons/gi";
import { RiFileExcel2Line } from "react-icons/ri";
import { MdOutlineRefresh } from "react-icons/md";
import { useContext, useState } from "react";
import SubjectItem from "./SubjectItem/SubjectItem";
import useSubjectsInfo from "../../hooks/useSubjectsInfo";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";


export default function ProyeccionesContainer() {

  const { tankenSubjects, aviableSubjects } = useSubjectsInfo();
  const [ teacherTab, setTeacherTab ] = useState(true);
  const { setSelectedTeacerId, setSelectedTeacher} = useContext(MainContext) as MainContextValues

  const iconStyle = { color: "white", fontSize: "2rem"}

  const handleChangeSelector = (value: string) => {
    console.log(`selected ${value}`);
  };

  const handleChangeRadio = (value: string) => {
    setTeacherTab(value === "a");
    //se deben colocar en null para prevenir posible bugs
    setSelectedTeacerId(null);
    setSelectedTeacher(null);
  };

  return <div className="proyecciones-container" >
    
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
      <h1>Proyecciones</h1>

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
      
      <div style={{ display: "flex", alignItems: "center", columnGap: "20px"}}>
        <Button type="link" shape="circle" icon={<GiSave />} style={iconStyle}/>
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
            <SubjectItem subjects={aviableSubjects} title="Asignaturas Disponibles"  gridArea="table" />
            <SubjectItem subjects={tankenSubjects} title="Asignaturas Asignadas"  gridArea="selected" />
          </>
      }

   
  </div>
}