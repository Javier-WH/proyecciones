import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacher";
import SubjectFooter from "./subjectsFooter/subjectFooter";
import "./proyeccionesContainer.css"
import { Button, Select } from 'antd';
import { GiSave } from "react-icons/gi";
import { RiFileExcel2Line } from "react-icons/ri";
import { MdOutlineRefresh } from "react-icons/md";

export default function ProyeccionesContainer() {

  const iconStyle = { color: "white", fontSize: "2rem"}

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };


  return <div className="proyecciones-container" >
    
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
      <h1>Proyecciones</h1>
      <Select
        defaultValue="Inscripciones 2024"
        style={{ width: 300 }}
        options={[{ value: 'Inscripciones 2024', label: 'Inscripciones 2024' }]}
        onChange={handleChange}
      />
      <div style={{ display: "flex", alignItems: "center", columnGap: "20px"}}>
        <Button type="link" shape="circle" icon={<GiSave />} style={iconStyle}/>
        <Button type="link" shape="circle" icon={<RiFileExcel2Line />} style={iconStyle} />
        <Button type="link" shape="circle" icon={<MdOutlineRefresh />} style={iconStyle} />
      </div>
    </div>
      <TeacherTable />
      <SelectedTeacher />
      <SubjectFooter />
  </div>
}