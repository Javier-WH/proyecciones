import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import Subjects from "./subjects/subjects";
import { Tag } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Subject } from "../../../interfaces/subject";
import useSetSubject from "../../../hooks/useSetSubject";
import "./selectedTeacher.css";

export default function SelectedTeacher() {
  const { selectedTeacher, getTeachersHoursData, selectedTeacerId, teachers, selectedQuarter, subjects } =
    useContext(MainContext) as MainContextValues;
  const [teacherData, setTeacherData] = useState(getTeachersHoursData(0));
  const [teacherPhoto, setTeacherPhoto] = useState(malePlaceHolder);
  const [subjecData, setSubjectData] = useState<Subject[]>([]);
  const { getTeacherHoursData } = useSetSubject(subjects || []);
  const [totalHours, setTotalHours] = useState("0");
  const [aviableHours, setAviableHours] = useState("0");
  const [usedHours, setUsedHours] = useState("0");
  const [overloaded, setOverloaded] = useState(false);
  const [haveConract, setHaveContract] = useState(false);

  useEffect(() => {
    if (!selectedTeacher) return;
    setHaveContract(
      teachers?.[selectedQuarter]?.[
        teachers[selectedQuarter]?.findIndex((teacher) => teacher.id === selectedTeacerId)
      ]?.type
        ? true
        : false
    );
  }, [selectedTeacerId, selectedQuarter, subjects]);

  useEffect(() => {
    if (!selectedTeacher || !selectedQuarter) return;
    const teacherHourData = getTeacherHoursData(selectedTeacher, selectedQuarter);
    if (teacherHourData.error) {
      console.log(teacherHourData.message);
      return;
    }

    if (teacherHourData.data) {
      const { totalHours, usedHours, aviableHours, overloaded } = teacherHourData.data;
      setTotalHours(totalHours);
      setUsedHours(usedHours);
      setAviableHours(aviableHours);
      setOverloaded(overloaded);
    }
  }, [selectedTeacerId, selectedQuarter, subjects]);

  useEffect(() => {
    const teacherSubjects = subjects?.filter(
      (subject) => subject.quarter[selectedQuarter] === selectedTeacerId
    );
    setSubjectData(teacherSubjects || []);
  }, [subjects, selectedQuarter, selectedTeacerId]);

  useEffect(() => {
    if (!teachers || !selectedTeacerId) return;
    const teacherIndex = teachers[selectedQuarter].findIndex((teacher) => teacher.id === selectedTeacerId);
    setTeacherData(getTeachersHoursData(teacherIndex || 0));

    if (selectedTeacher?.photo) {
      //aqui se hace el fetch de la foto
      console.log(selectedTeacher.photo);
    } else if (selectedTeacher?.gender === "f") {
      setTeacherPhoto(femalePlaceHolder);
    } else {
      setTeacherPhoto(malePlaceHolder);
    }
  }, [selectedTeacerId, getTeachersHoursData, selectedTeacher, teachers, selectedQuarter]);

  if (!selectedTeacher) {
    return (
      <div style={{ gridArea: "selected", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay docente seleccionado`}</Tag>
      </div>
    );
  }

  const hoursDataStyle = () => {
    let color = "black";
    if (overloaded) {
      color = "red";
    } else if (usedHours === "0") {
      color = "grey";
    }

    return { color };
  };

  return (
    <div className="selected-teacher-container" style={{ gridArea: "selected" }}>
      <img src={teacherPhoto} alt="" />
      <div className="teacher-info">
        <span className="teacher-name">{`${selectedTeacher?.name} ${selectedTeacher?.lastName}`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <span>{`CI: ${selectedTeacher?.ci}`} </span>
        </div>
        <span>{`Titulo: ${selectedTeacher?.title}`}</span>

        {haveConract && (
          <>
            <span>{`Tipo de contrato: ${selectedTeacher?.type}`}</span>
            <span style={hoursDataStyle()}>{`Carga Horaria: ${totalHours}`}</span>
            <span style={hoursDataStyle()}>{`Horas asignadas: ${usedHours}`}</span>
            <span style={hoursDataStyle()}>{`Horas disponibles: ${aviableHours}`}</span>
          </>
        )}
      </div>

      <div
        style={{ width: "100%", height: "30px", marginLeft: "30px", display: "flex", alignItems: "center" }}>
        {overloaded && <Tag color="error" icon={<ExclamationCircleOutlined />}>{`Sobrecarga de Horas`}</Tag>}

        {usedHours === "0" && haveConract && (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`Sin Horas Asignadas`}</Tag>
        )}

        {!haveConract && (
          <Tag
            color="error"
            icon={<ExclamationCircleOutlined />}
            style={{ marginTop: "-100%" }}>{`El profesor no tiene un contrato`}</Tag>
        )}
      </div>

      {
        // solo se muestra la lista de materias y el boton de agregar materia si el profesor tiene un contrato
        haveConract && <Subjects data={subjecData} />
      }
    </div>
  );
}

