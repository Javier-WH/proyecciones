/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import Subjects from "./subjects/subjects";
import { Tag, Radio, RadioChangeEvent } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Subject } from "../../../interfaces/subject";
import useSetSubject from "../../../hooks/useSetSubject";
import "./selectedTeacher.css";

export default function SelectedTeacher() {
  const {
    selectedTeacher,
    getTeachersHoursData,
    selectedTeacerId,
    teachers,
    selectedQuarter,
    subjects,
    setSelectedQuarter,
  } = useContext(MainContext) as MainContextValues;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_teacherData, setTeacherData] = useState(getTeachersHoursData(0));
  const [teacherPhoto, setTeacherPhoto] = useState(malePlaceHolder);
  const [subjecData, setSubjectData] = useState<Subject[]>([]);
  const { getTeacherHoursData } = useSetSubject(subjects || []);
  const [totalHours, setTotalHours] = useState("0");
  const [aviableHoursQ1, setAviableHoursQ1] = useState("0");
  const [usedHoursQ1, setUsedHoursQ1] = useState("0");
  const [overloadedQ1, setOverloadedQ1] = useState(false);
  const [aviableHoursQ2, setAviableHoursQ2] = useState("0");
  const [usedHoursQ2, setUsedHoursQ2] = useState("0");
  const [overloadedQ2, setOverloadedQ2] = useState(false);
  const [aviableHoursQ3, setAviableHoursQ3] = useState("0");
  const [usedHoursQ3, setUsedHoursQ3] = useState("0");
  const [overloadedQ3, setOverloadedQ3] = useState(false);

  const [haveConract, setHaveContract] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(true);

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
    const teacherHourData = getTeacherHoursData(selectedTeacher);
    if (teacherHourData.error) {
      console.log(teacherHourData.message);
      return;
    }

    if (teacherHourData.data) {
      const { q1, q2, q3 } = teacherHourData.data;
      setTotalHours(q1?.totalHours || "0");
      setUsedHoursQ1(q1?.usedHours || "0");
      setAviableHoursQ1(q1?.aviableHours || "0");
      setOverloadedQ1(q1?.overloaded || false);
      setUsedHoursQ2(q2?.usedHours || "0");
      setAviableHoursQ2(q2?.aviableHours || "0");
      setOverloadedQ2(q2?.overloaded || false);
      setUsedHoursQ3(q3?.usedHours || "0");
      setAviableHoursQ3(q3?.aviableHours || "0");
      setOverloadedQ3(q3?.overloaded || false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacerId, selectedQuarter, subjects]);

  useEffect(() => {
    if (!subjects || subjects?.length === 0) return;
    let teacherSubjects: Subject[] = [];
    if (showAllSubjects) {
      teacherSubjects = subjects.filter(
        (subject) =>
          subject.quarter.q1 === selectedTeacerId ||
          subject.quarter.q2 === selectedTeacerId ||
          subject.quarter.q3 === selectedTeacerId
      );
    } else {
      teacherSubjects = subjects?.filter((subject) => subject.quarter[selectedQuarter] === selectedTeacerId);
    }
    setSubjectData(teacherSubjects || []);
  }, [subjects, selectedQuarter, selectedTeacerId, showAllSubjects]);

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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay docente seleccionado`}</Tag>
      </div>
    );
  }

  const onChangeQuarter = (e: RadioChangeEvent) => {
    const value = e.target.value;
    if (value === "0") {
      setShowAllSubjects(true);
      return;
    }
    setShowAllSubjects(false);
    if (value === "1" || value === "2" || value === "3") {
      setSelectedQuarter(`q${value}` as "q1" | "q2" | "q3");
    }
  };

  const hourStyle = (quarter: "q1" | "q2" | "q3") => {
    let color = "black";

    if (quarter === "q1") {
      overloadedQ1 ? (color = "red") : usedHoursQ1 === "0" ? (color = "gray") : "black";
    }
    if (quarter === "q2") {
      overloadedQ2 ? (color = "red") : usedHoursQ2 === "0" ? (color = "gray") : "black";
    }
    if (quarter === "q3") {
      overloadedQ3 ? (color = "red") : usedHoursQ3 === "0" ? (color = "gray") : "black";
    }

    return {
      color,
    };
  };

  return (
    <div className="selected-teacher-container" style={{}}>
      <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
        <img src={teacherPhoto} alt="" style={{ width: "150px", height: "auto", justifySelf: "center" }} />
        <div className="teacher-info">
          <span className="teacher-name">{`${selectedTeacher?.name} ${selectedTeacher?.lastName}`}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
            <span>{`CI: ${selectedTeacher?.ci}`} </span>
          </div>
          <span>{`Titulo: ${selectedTeacher?.title}`}</span>

          {haveConract && (
            <>
              <span>{`Tipo de contrato: ${selectedTeacher?.type}`}</span>
              <span>{`Carga Horaria: ${totalHours}`}</span>
              <span>
                <span>{`Horas asignadas: `}</span>
                <span style={hourStyle("q1")}>{usedHoursQ1}</span>/
                <span style={hourStyle("q2")}>{usedHoursQ2}</span>/
                <span style={hourStyle("q3")}>{usedHoursQ3}</span>
              </span>
              <span>
                <span>{`Horas disponibles: `}</span>
                <span>{aviableHoursQ1}/</span>
                <span>{aviableHoursQ2}/</span>
                <span>{aviableHoursQ3}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div
        style={{ width: "100%", height: "30px", marginLeft: "30px", display: "flex", alignItems: "center" }}>
        {(overloadedQ1 || overloadedQ2 || overloadedQ3) && (
          <Tag color="error" icon={<ExclamationCircleOutlined />}>{`Sobrecarga de Horas`}</Tag>
        )}

        {((usedHoursQ1 === "0" && selectedQuarter === "q1") ||
          (usedHoursQ2 === "0" && selectedQuarter === "q2") ||
          (usedHoursQ3 === "0" && selectedQuarter === "q3") ||
          (usedHoursQ1 === "0" && usedHoursQ2 === "0" && usedHoursQ3 === "0")) &&
          !showAllSubjects &&
          haveConract && (
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
        haveConract && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Radio.Group onChange={onChangeQuarter} defaultValue="0" size="small">
                <Radio.Button value="0">Todas</Radio.Button>
                <Radio.Button value="1">Trimestre 1</Radio.Button>
                <Radio.Button value="2">Trimestre 2</Radio.Button>
                <Radio.Button value="3">Trimestre 3</Radio.Button>
              </Radio.Group>
            </div>
            <Subjects data={subjecData} showAllSubjects={showAllSubjects} />
          </>
        )
      }
    </div>
  );
}

