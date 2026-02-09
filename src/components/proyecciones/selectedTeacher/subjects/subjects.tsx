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

import AdministrativeHoursModal from "./AdministrativeHoursModal";
import { v4 as uuidv4 } from 'uuid';

const Subjects: React.FC<{
  data: Subject[] | null;
  showAllSubjects: boolean;
  overloaded: boolean;
  emptyHours: boolean;
}> = ({ data, showAllSubjects, overloaded, emptyHours }) => {
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
    selectedTeacher
  } = useContext(MainContext) as MainContextValues;

  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false);
  const [adminHours, setAdminHours] = React.useState({ q1: 0, q2: 0, q3: 0 });

  const { removeSubjectFromTeacher } = useSetSubject(subjects || []);

  const handleOpenAdminHoursModal = () => {
    if (!subjects || !selectedTeacerId) return;

    // Buscar si ya existen horas administrativas para este profesor
    // La clave es única: "ADMINISTRATIVE_HOURS"
    // Y debemos verificar que pertenezca a este profesor en algún trimestre
    const existingAdminSubject = subjects.find(
      (s) => s.key === "ADMINISTRATIVE_HOURS" &&
        (s.quarter.q1 === selectedTeacerId ||
          s.quarter.q2 === selectedTeacerId ||
          s.quarter.q3 === selectedTeacerId)
    );

    if (existingAdminSubject) {
      setAdminHours({
        q1: existingAdminSubject.hours.q1 || 0,
        q2: existingAdminSubject.hours.q2 || 0,
        q3: existingAdminSubject.hours.q3 || 0,
      });
    } else {
      setAdminHours({ q1: 0, q2: 0, q3: 0 });
    }

    setIsAdminModalOpen(true);
  };

  const handleSaveAdminHours = (hours: { q1: number; q2: number; q3: number }) => {
    if (!subjects || !selectedTeacerId || !selectedTeacher) return;

    const newSubjects = [...subjects];
    const existingSubjectIndex = newSubjects.findIndex(
      (s) => s.key === "ADMINISTRATIVE_HOURS" &&
        (s.quarter.q1 === selectedTeacerId ||
          s.quarter.q2 === selectedTeacerId ||
          s.quarter.q3 === selectedTeacerId)
    );

    if (existingSubjectIndex !== -1) {
      // Actualizar existente
      newSubjects[existingSubjectIndex] = {
        ...newSubjects[existingSubjectIndex],
        hours: {
          q1: hours.q1,
          q2: hours.q2,
          q3: hours.q3,
        },
        // Asegurar que el profesor esté asignado en los trimestres donde hay horas
        quarter: {
          q1: selectedTeacerId,
          q2: selectedTeacerId,
          q3: selectedTeacerId
        }
      };
    } else {
      // Crear nueva materia administrativa
      const newSubject: Subject = {
        id: uuidv4(),
        innerId: uuidv4(),
        subject: "HORAS ADMINISTRATIVAS",
        key: "ADMINISTRATIVE_HOURS",
        hours: {
          q1: hours.q1,
          q2: hours.q2,
          q3: hours.q3,
        },
        pnf: "ADMIN",
        pnfId: "ADMIN",
        seccion: "ADMIN",
        quarter: {
          q1: selectedTeacerId,
          q2: selectedTeacerId,
          q3: selectedTeacerId
        },
        pensum_id: "ADMIN",
        trayectoId: "ADMIN",
        trayectoName: "Administrativo",
        trayecto_saga_id: "ADMIN",
        turnoName: "ADMIN",
        linkedToSection: ""
      };
      newSubjects.push(newSubject);
    }

    handleSubjectChange(newSubjects);
  };


  const handleRemoveSubject = (subject: Subject) => {
    if (!userData?.su && userPNF !== subject.pnfId && subject.key !== "ADMINISTRATIVE_HOURS") {
      message.error("No puede eliminar materias asignadas de otros programas");
      return;
    }

    // Si es administrativa, la eliminamos directamente del array y actualizamos
    if (subject.key === "ADMINISTRATIVE_HOURS") {
      const newSubjects = subjects?.filter(s => s.innerId !== subject.innerId) || [];
      handleSubjectChange(newSubjects);
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
    if (subject.key === "ADMINISTRATIVE_HOURS") {
      handleOpenAdminHoursModal();
      return;
    }

    if (!userData?.su && userPNF !== subject.pnfId) {
      message.error("No puede modificar materias asignadas de otros programas");
      return;
    }

    setEditSubjectQuarter(subject);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0, // Critical for nested flex scrolling
        overflow: "hidden",
      }}>
      <div
        className="teacher-subjects-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px 8px 4px",
          background: "transparent",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
          {overloaded && (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              Sobrecarga
            </Tag>
          )}
          {emptyHours && (
            <Tag color="warning" icon={<ExclamationCircleOutlined />}>
              Sin Horas
            </Tag>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="default"
            shape="round"
            onClick={handleOpenAdminHoursModal}
          >
            Agregar Horas Admin.
          </Button>
          <Button
            type="primary"
            shape="round"
            icon={<MdAssignmentAdd />}
            onClick={() => setOpenAddSubjectToTeacherModal(true)}
            style={{ boxShadow: "0 2px 5px rgba(24, 144, 255, 0.3)" }}>
            Agregar Materia
          </Button>
        </div>
      </div>

      <div
        className="teacher-subjects-body">
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
                  padding: "12px",
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
                    {subject.key !== "ADMINISTRATIVE_HOURS" && (
                      <Tag color="geekblue" style={{ margin: 0 }}>
                        Sección: {subject.turnoName[0]}-{subject.seccion}
                      </Tag>
                    )}

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
      <AdministrativeHoursModal
        open={isAdminModalOpen}
        onCancel={() => setIsAdminModalOpen(false)}
        onSave={handleSaveAdminHours}
        initialHours={adminHours}
      />
    </div>
  );
};

export default Subjects;


