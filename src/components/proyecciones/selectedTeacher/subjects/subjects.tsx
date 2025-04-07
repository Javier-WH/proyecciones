import React, { useContext } from "react";
import { Subject } from "../../../../interfaces/subject";
import { Button, message } from "antd";
import { FaTrashAlt } from "react-icons/fa";
import { MdAssignmentAdd } from "react-icons/md";
//import { IoMdSwap } from "react-icons/io";
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

  const { removeSubjectFromTeacher } = useSetSubject(subjects || []);
  const handleRemoveSubject = (subject: Subject) => {
    const responseRemoveSubject = removeSubjectFromTeacher({
      subjectId: subject.innerId,
      teacherId: selectedTeacerId,
    });

    if (responseRemoveSubject.error) {
      console.log(responseRemoveSubject.message);
      return;
    }

    if (responseRemoveSubject.data) {
      //actualizo la lista de materias
      handleSubjectChange(responseRemoveSubject.data);
    }
  };

  const handleSwapSubjects = (subject: Subject) => {
    if (!data) return;
    const selected = data.filter((selected) => selected.innerId === subject.innerId);
    if (selected.length === 0) {
      message.error("No se encontro la materia seleccionada");
      return;
    }
    setSelectedSubject(selected[0]);
    setOpenChangeSubjectFromTeacherModal(true);
  };

  const getQuarterValue = (quarter: "q1" | "q2" | "q3") => {
    switch (quarter) {
      case "q1":
        return "1";
      case "q2":
        return "2";
      case "q3":
        return "3";

      default:
        return "unknown";
    }
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
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", width: "100%" }}>
                  <span>{subject.subject}</span>
                  <span>{subject.trayectoName}</span>
                </div>

                <div className="teacher-subjects-buttons">
                  {/*<Button
                    type="link"
                    shape="round"
                    style={{ color: "white", fontSize: "18px" }}
                    onClick={() => handleSwapSubjects(subject)}>
                    <IoMdSwap />
                  </Button>*/}
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
                  columnGap: "1px",
                  rowGap: "5px",
                  justifyContent: "start",
                  flexWrap: "wrap",
                }}>
                <Tag color="default">{subject.pnf}</Tag>
                <Tag color="default">{`Seccion: ${subject.turnoName[0]}-${subject.seccion}`}</Tag>
                {subject.currentQuarter ? (
                  <Tag color="default">{`Horas: ${subject.hours.q1}/${subject.hours.q2}/${subject.hours.q3}`}</Tag>
                ) : (
                  <Tag color="default">{`Horas: ${subject.hours[selectedQuarter]}`}</Tag>
                )}
                {/*subject.currentQuarter && (
                  <Tag color="default">{`Trimestre: ${getQuarterValue(subject.currentQuarter)}`}</Tag>
                )*/}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Subjects;

