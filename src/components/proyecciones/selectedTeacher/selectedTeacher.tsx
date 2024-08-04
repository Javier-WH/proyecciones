import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import Subjects from "./subjects/subjects";
import { Tag, Button } from 'antd';
import { ExclamationCircleOutlined, } from '@ant-design/icons';
import { FaSearch } from "react-icons/fa";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import "./selectedTeacher.css"


export default function SelectedTeacher() {

  const { selectedTeacher, getTeachersHoursData, selectedTeacerId, teachers, selectedQuarter } = useContext(MainContext) as MainContextValues;
  const [teacherData, setTeacherData] = useState(getTeachersHoursData( 0));
  const [teacherPhoto, setTeacherPhoto] = useState(malePlaceHolder);


  useEffect(() => {
    if(!teachers || !selectedTeacerId) return
    const teacherIndex = teachers[selectedQuarter].findIndex(teacher => teacher.id === selectedTeacerId);
    setTeacherData(getTeachersHoursData(teacherIndex || 0));

    if (selectedTeacher?.photo) {
      //aqui se hace el fetch de la foto
      console.log(selectedTeacher.photo)
    } else if (selectedTeacher?.gender === "f") {
      setTeacherPhoto(femalePlaceHolder);
    } else {
      setTeacherPhoto(malePlaceHolder);
    }
  }, [selectedTeacerId, getTeachersHoursData, selectedTeacher, teachers, selectedQuarter]);


  if (!selectedTeacher) {
    return <div style={{ gridArea: "selected", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay docente seleccionado`}</Tag>
    </div>
  }

  return (
    <div className="selected-teacher-container" style={{ gridArea: "selected" }}>

      <img src={teacherPhoto} alt="" />
      <div className="teacher-info">
        <span className="teacher-name" >{`${selectedTeacher?.name} ${selectedTeacher?.lastName}`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <span >{`CI: ${selectedTeacher?.ci}`} </span>
          <Button type="link" shape='round' className="teacher-search-button">
            <FaSearch />
          </Button>
        </div>
        <span >{`Titulo: ${selectedTeacher?.title}`}</span>
        <span >{`Tipo de contrato: ${selectedTeacher?.type}`}</span>
        <span >{`Carga Horaria: ${ teacherData && teacherData.partTime}`}</span>
        <span style={{ color: teacherData && (teacherData.asignedHpours > teacherData.partTime ? "red" : "black") }} >{`Horas asignadas: ${teacherData && teacherData.asignedHpours}`}</span>
        <span style={{ color: teacherData && (teacherData.asignedHpours > teacherData.partTime ? "red" : "black") }}>{`Horas disponibles: ${teacherData && teacherData.aviableHours}`}</span>
      </div>

      <div style={{ width: "100%", height: "30px", marginLeft: "30px", display: "flex", alignItems: "center" }}>
        {
          teacherData && teacherData.asignedHpours > teacherData.partTime
            ? <Tag color="error" icon={<ExclamationCircleOutlined />}>{`Sobrecarga de Horas`}</Tag>
            : null
        }
        {
          teacherData && teacherData.asignedHpours === 0
            ? <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`Sin Horas Asignadas`}</Tag>
            : null
        }
      </div>

      <Subjects data={teachers?.[selectedQuarter]?.[teachers[selectedQuarter]?.findIndex(teacher => teacher.id === selectedTeacerId)]?.load ?? null} />

    </div>
  );
}