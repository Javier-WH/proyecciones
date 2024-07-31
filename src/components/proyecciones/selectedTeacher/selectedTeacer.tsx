import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import Subjects from "./subjects/subjects";
import { Tag } from 'antd';
import {  ExclamationCircleOutlined,} from '@ant-design/icons';
import { MainContextValues } from "../../../interfaces/contextInterfaces";


export default function SelectedTeacher() {

  const { selectedTeacher, getTeachersHoursData, selectedTeacerId } = useContext(MainContext) as MainContextValues;
  const [ teacherData, setTeacherData ] = useState(getTeachersHoursData(selectedTeacerId || 0));
  const [teacherPhoto, setTeacherPhoto] = useState(malePlaceHolder);

  useEffect(() => {
    setTeacherData(getTeachersHoursData(selectedTeacerId || 0));
    
    if(selectedTeacher?.photo){
     console.log(selectedTeacher.photo)
    }else if(selectedTeacher?.gender === "f"){
      setTeacherPhoto(femalePlaceHolder);
    }else{
      setTeacherPhoto(malePlaceHolder);
    }



  }, [selectedTeacerId, getTeachersHoursData, selectedTeacher]);


  if (!selectedTeacher) {
    return <div className="selected-teacher-container">
      <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay docente seleccionado`}</Tag>
    </div>
  }

  return (
    <div className="selected-teacher-container">
      <div style={{ display: "flex" }}>
        <img src={teacherPhoto} alt="" />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: "20px", rowGap: "2px" }}>
          <span className="teacher-name" >{`${selectedTeacher?.name} ${selectedTeacher?.lastName}`}</span>
          <Tag color="blue">{`CI: ${selectedTeacher?.ci}`}</Tag>
          <Tag color="blue">{`Titulo: ${selectedTeacher?.title}`}</Tag>
          <Tag color="blue">{`Tipo de contrato: ${selectedTeacher?.type}`}</Tag>
          <Tag color="blue">{`Horas asignadas: ${teacherData.asignedHpours}`}</Tag>
          <Tag color="blue">{`Horas disponibles: ${getTeachersHoursData(selectedTeacerId || 0).aviableHours}`}</Tag>
          <Tag color="blue">{`Carga Horaria: ${getTeachersHoursData(selectedTeacerId || 0).partTime}`}</Tag>
        </div>
      </div>
      <Subjects data={selectedTeacher?.load} />
    </div>
  );
}