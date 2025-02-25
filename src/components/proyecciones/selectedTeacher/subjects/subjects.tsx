import React, { useContext } from "react";
import { Subject } from "../../../../interfaces/subject";
import { Button } from "antd";
import { FaTrashAlt } from "react-icons/fa";
import { MdAssignmentAdd } from "react-icons/md";
import { IoMdSwap } from "react-icons/io";
import { Tag } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { MainContext } from "../../../../context/mainContext";
import { MainContextValues } from "../../../../interfaces/contextInterfaces";
import useSetSubject from "../../../../hooks/useSetSubject";
import "./subjects.css";

const Subjects: React.FC<{ data: Subject[] | null }> = ({ data }) => {
  const {
    setOpenAddSubjectToTeacherModal,
    teachers,
    selectedTeacerId,
    subjects,
    setOpenChangeSubjectFromTeacherModal,
    setSelectedSubject,
    selectedQuarter,
    handleSubjectChange,
    handleTeacherChange,
  } = useContext(MainContext) as MainContextValues;

  const { removeSubjectFromTeacher } = useSetSubject({
    subjectArray: subjects ?? [],
    teacherArray: teachers ?? { q1: [], q2: [], q3: [] },
  });

  const handleRemoveSubject = (subject: Subject) => {
    const response = removeSubjectFromTeacher({
      subject,
      teacherId: selectedTeacerId ?? "",
    });

    const { teacherArray, subjectArray } = response;

    //console.log({ teacherArray, subjectArray });

    //actualizo la lista de materias
    //handleSubjectChange([...subjects, ...(savedSubject ? [savedSubject] : [])]);
    //handleTeacherChange(teachersCopy);
  };

  const handleSwapSubjects = (subject: Subject) => {
    if (!data) return;
    const selected = data.filter((selected) => {
      if (
        selected.pensum_id === subject.pensum_id &&
        selected.seccion === subject.seccion &&
        selected.trayectoName === subject.trayectoName &&
        selected.turnoName === subject.turnoName
      )
        return selected;
    });

    setSelectedSubject(selected[0]);
    setOpenChangeSubjectFromTeacherModal(true);
  };

  return (
    <div className="teacher-subjects-container">
      <div className="teacher-subjects-header">
        <h2>Asignaturas Asignadas</h2>
        <Button
          type="link"
          shape="round"
          size="large"
          style={{ fontSize: "14px" }}
          onClick={() => setOpenAddSubjectToTeacherModal(true)}>
          {" "}
          <MdAssignmentAdd />
          Agregar
        </Button>
      </div>

      <div className="teacher-subjects-body">
        {!data || data.length === 0 ? (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay asignaturas asignadas`}</Tag>
        ) : (
          data.map((subject, i) => (
            <div key={i} style={{ marginBottom: "5px" }}>
              <h4>
                {subject.subject}
                <div className="teacher-subjects-buttons">
                  <Button
                    type="link"
                    shape="round"
                    style={{ color: "white", fontSize: "18px" }}
                    onClick={() => handleSwapSubjects(subject)}>
                    <IoMdSwap />
                  </Button>
                  <Button
                    id={`${subject.id}:${subject.pensum_id}:${subject.seccion}:${subject.trayectoName}:${subject.turnoName}`}
                    type="link"
                    shape="round"
                    danger
                    onClick={() => handleRemoveSubject(subject)}>
                    <FaTrashAlt />
                  </Button>
                </div>
              </h4>
              <div
                style={{
                  marginLeft: "20px",
                  marginTop: "3px",
                  display: "flex",
                  gap: "1px",
                  justifyContent: "start",
                  flexWrap: "wrap",
                }}>
                <Tag color="default">{subject.pnf}</Tag>
                <Tag color="default">{`Seccion: ${subject.turnoName[0]}-${subject.seccion}`}</Tag>
                <Tag color="default">{subject.trayectoName}</Tag>
                <Tag color="default">{`Horas: ${subject.hours}`}</Tag>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Subjects;

