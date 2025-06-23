import React, { useContext } from "react";
import { Subject } from "../../../../interfaces/subject";
import { Button, message } from "antd";
import { FaTrashAlt } from "react-icons/fa";
import { TbTopologyStar3 } from "react-icons/tb";
import { MdAssignmentAdd } from "react-icons/md";
import { Tag } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { MainContext } from "../../../../context/mainContext";
import { MainContextValues } from "../../../../interfaces/contextInterfaces";
import useSetSubject from "../../../../hooks/useSetSubject";

import "./subjects.css";

const Subjects: React.FC<{ data: Subject[] | null; showAllSubjects: boolean }> = ({
  data,
  showAllSubjects,
}) => {
  const {
    setOpenAddSubjectToTeacherModal,
    selectedTeacerId,
    subjects,
    selectedQuarter,
    handleSubjectChange,
    subjectColors,
    setEditSubjectQuarter,
    userData,
    userPNF,
  } = useContext(MainContext) as MainContextValues;

  const { removeSubjectFromTeacher } = useSetSubject(subjects || []);
  const handleRemoveSubject = (subject: Subject) => {
    if (!userData?.su && userPNF !== subject.pnfId) {
      message.error("No puede eliminar materias asignadas de otros programas");
      return;
    }
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

  const handleEditSubjectQuarter = (subject: Subject) => {
    if (!userData?.su && userPNF !== subject.pnfId) {
      message.error("No puede modificar materias asignadas de otros programas");
      return;
    }

    setEditSubjectQuarter(subject);
  };

  return (
    <div
      style={{
        overflow: "hidden",
        height: "calc(100vh - 280px)",
      }}>
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
          data.map((subject, i) => {
            const backgroundColor = subjectColors?.[subject.pnfId] || "pink";
            return (
              <div key={i} style={{ minHeight: "80px", height: "content", position: "relative" }}>
                <div className="teacher-subjects-buttons">
                  <Button
                    id={`${subject.id}:${subject.pensum_id}:${subject.seccion}:${subject.trayectoName}:${subject.turnoName}`}
                    type="link"
                    shape="round"
                    danger
                    onClick={() => handleRemoveSubject(subject)}>
                    <FaTrashAlt />
                  </Button>

                  {showAllSubjects && (
                    <Button
                      id={`u-${subject.id}:${subject.pensum_id}:${subject.seccion}:${subject.trayectoName}:${subject.turnoName}`}
                      type="link"
                      style={{ color: "wheat" }}
                      shape="round"
                      onClick={() => handleEditSubjectQuarter(subject)}>
                      <TbTopologyStar3 />
                    </Button>
                  )}
                </div>
                <div style={{ height: "10px", backgroundColor: backgroundColor }}></div>
                <div style={{ marginRight: "22px", display: "flex", flexDirection: "column" }}>
                  <h4
                    style={{
                      width: "90%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      height: "content",
                      marginTop: "10px",
                    }}>
                    <span>{subject.subject}</span>
                    <span>{subject.trayectoName}</span>
                  </h4>

                  <div
                    style={{
                      marginLeft: "20px",
                      marginTop: "10px",
                      display: "flex",
                      columnGap: "1px",
                      rowGap: "5px",
                      justifyContent: "start",
                      flexWrap: "wrap",
                    }}>
                    <Tag color="default">{subject.pnf}</Tag>
                    <Tag color="default">{`Seccion: ${subject.turnoName[0]}-${subject.seccion}`}</Tag>
                    {showAllSubjects ? (
                      <Tag color="default">{`Horas: ${subject?.hours?.q1 || 0} / ${
                        subject?.hours?.q2 || 0
                      } / ${subject?.hours?.q3 || 0}`}</Tag>
                    ) : (
                      <Tag color="default">{`Horas: ${subject?.hours?.[selectedQuarter] || 0}`}</Tag>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Subjects;

