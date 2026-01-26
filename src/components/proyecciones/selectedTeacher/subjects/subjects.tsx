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
        display: "flex",
        flexDirection: "column",
      }}>
      <div
        className="teacher-subjects-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px 16px 4px",
          background: "transparent",
        }}>
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "#374151",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
          Asignaturas Asignadas
        </h2>
        <Button
          type="primary"
          shape="round"
          icon={<MdAssignmentAdd />}
          onClick={() => setOpenAddSubjectToTeacherModal(true)}
          style={{ boxShadow: "0 2px 5px rgba(24, 144, 255, 0.3)" }}>
          Agregar Materia
        </Button>
      </div>

      <div
        className="teacher-subjects-body"
        style={{
          overflowY: "auto",
          padding: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
        {!data || data.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "40px",
            }}>
            <Tag
              color="default"
              style={{
                padding: "8px 16px",
                fontSize: "0.9rem",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              icon={<ExclamationCircleOutlined />}>
              No hay asignaturas asignadas
            </Tag>
          </div>
        ) : (
          data.map((subject, i) => {
            const highlightColor = subjectColors?.[subject.pnfId] || "#1890ff";
            return (
              <div
                key={i}
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  border: "1px solid #f0f0f0",
                  borderLeft: `5px solid ${highlightColor}`,
                  padding: "16px",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}>
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    display: "flex",
                    gap: "8px",
                  }}>
                  {showAllSubjects && (
                    <Button
                      type="text"
                      icon={<TbTopologyStar3 />}
                      onClick={() => handleEditSubjectQuarter(subject)}
                      style={{ color: "#faad14" }}
                    />
                  )}
                  <Button
                    type="text"
                    danger
                    icon={<FaTrashAlt />}
                    onClick={() => handleRemoveSubject(subject)}
                  />
                </div>

                <div style={{ marginRight: "60px" }}>
                  <h4
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "#1f1f1f",
                    }}>
                    {subject.subject}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                    {subject.trayectoName}
                  </span>

                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}>
                    <Tag color="cyan" style={{ margin: 0 }}>
                      {subject.pnf}
                    </Tag>
                    <Tag color="geekblue" style={{ margin: 0 }}>
                      Sección: {subject.turnoName[0]}-{subject.seccion}
                    </Tag>
                    {showAllSubjects ? (
                      <Tag color="purple" style={{ margin: 0 }}>{`Horas: ${subject?.hours?.q1 || 0
                        } / ${subject?.hours?.q2 || 0} / ${subject?.hours?.q3 || 0}`}</Tag>
                    ) : (
                      <Tag color="purple" style={{ margin: 0 }}>{`Horas: ${subject?.hours?.[selectedQuarter] || 0
                        }`}</Tag>
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

