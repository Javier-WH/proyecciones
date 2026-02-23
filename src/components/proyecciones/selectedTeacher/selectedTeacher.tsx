/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import Subjects from "./subjects/subjects";
import { Tag, Radio, RadioChangeEvent, Alert } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Subject } from "../../../interfaces/subject";
import useSetSubject from "../../../hooks/useSetSubject";
import Photo from "../../photo/photo";
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
      teachers?.[
        teachers?.findIndex((teacher) => teacher.id === selectedTeacerId)
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
    const teacherIndex = teachers.findIndex((teacher) => teacher.id === selectedTeacerId);
    setTeacherData(getTeachersHoursData(teacherIndex || 0));


  }, [selectedTeacerId, getTeachersHoursData, selectedTeacher, teachers, selectedQuarter]);

  if (!selectedTeacher) {
    return (
      <div
        className="selected-teacher-container"
        style={{
          padding: "0 10px",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "40px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            border: "1px solid #f0f0f0",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            width: "100%",
            maxWidth: "400px",
          }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#f5f5f5",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}>
            <ExclamationCircleOutlined style={{ fontSize: "32px", color: "#d9d9d9" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: "#595959", fontSize: "1.1rem" }}>
              Ningún docente seleccionado
            </h3>
            <span style={{ color: "#8c8c8c", fontSize: "0.9rem" }}>
              Seleccione un profesor de la lista para ver su información y gestionar su carga horaria.
            </span>
          </div>
        </div>
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
    <div className="selected-teacher-container" style={{ padding: "0 10px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flexShrink: 0,
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginBottom: "16px",
          border: "1px solid #f0f0f0",
        }}>
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
          {/* Photo Section */}
          <div
            style={{
              width: "140px",
              height: "140px",
              flexShrink: 0,
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid #e6e6e6",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              position: "relative",
            }}>
            <Photo teacher={selectedTeacher} />
          </div>

          {/* Info Section */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {!!selectedTeacher?.is_placeholder && (
              <Alert
                message={<span style={{ fontSize: '13px', fontWeight: 600 }}>Profesor Placeholder</span>}
                description={<span style={{ fontSize: '12px' }}>Este perfil es temporal y se utiliza para asignar materias sin docente asignado.</span>}
                type="warning"
                showIcon
                style={{ marginBottom: '8px', padding: '6px 12px' }}
              />
            )}
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1f1f1f",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                }}>
                {`${selectedTeacher?.lastName} ${selectedTeacher?.name}`}
              </h2>
              <span style={{ color: "#8c8c8c", fontSize: "0.9rem", fontWeight: 500 }}>
                {selectedTeacher?.title}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
              <Tag color="blue" style={{ margin: 0, padding: "4px 10px", fontSize: "0.85rem" }}>
                CI: {selectedTeacher?.ci}
              </Tag>
              {haveConract ? (
                <Tag color="cyan" style={{ margin: 0, padding: "4px 10px", fontSize: "0.85rem" }}>
                  {selectedTeacher?.type}
                </Tag>
              ) : (
                <Tag color="error">Sin Contrato</Tag>
              )}
            </div>

            {/* Stats Area */}
            {haveConract && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "stretch",
                  gap: "12px",
                  backgroundColor: "#f9fafb",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #f0f0f0",
                }}>
                {/* Carga Total */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>CARGA TOTAL</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
                    {totalHours}
                  </span>
                </div>
                {/* Semester I: T1 + T2 */}
                <div style={{
                  display: "flex",
                  flex: 2,
                  gap: "8px",
                  border: "1.5px dashed #c4b5fd",
                  borderRadius: "8px",
                  padding: "6px 12px 2px",
                  backgroundColor: "#faf5ff",
                  position: "relative",
                }}>
                  <span style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#faf5ff",
                    padding: "0 6px",
                    fontSize: "0.6rem",
                    color: "#8b5cf6",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>SEMESTRE I</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>T1 (U/D)</span>
                    <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                      <span style={hourStyle("q1")}>{usedHoursQ1}</span>
                      <span style={{ color: "#d1d5db", margin: "0 2px" }}>/</span>
                      <span style={{ color: "#374151" }}>{aviableHoursQ1}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>T2 (U/D)</span>
                    <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                      <span style={hourStyle("q2")}>{usedHoursQ2}</span>
                      <span style={{ color: "#d1d5db", margin: "0 2px" }}>/</span>
                      <span style={{ color: "#374151" }}>{aviableHoursQ2}</span>
                    </div>
                  </div>
                </div>
                {/* Semester II: T3 */}
                <div style={{
                  display: "flex",
                  flex: 1,
                  border: "1.5px dashed #c4b5fd",
                  borderRadius: "8px",
                  padding: "6px 12px 2px",
                  backgroundColor: "#faf5ff",
                  position: "relative",
                }}>
                  <span style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#faf5ff",
                    padding: "0 6px",
                    fontSize: "0.6rem",
                    color: "#8b5cf6",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>SEMESTRE II</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>T3 (U/D)</span>
                    <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                      <span style={hourStyle("q3")}>{usedHoursQ3}</span>
                      <span style={{ color: "#d1d5db", margin: "0 2px" }}>/</span>
                      <span style={{ color: "#374151" }}>{aviableHoursQ3}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quarter Selector */}
        {haveConract && (
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderTop: "1px solid #f0f0f0",
              paddingTop: "16px",
              gap: "4px",
            }}>
            <Radio.Group onChange={onChangeQuarter} defaultValue="0" buttonStyle="solid">
              <Radio.Button value="0">Todas</Radio.Button>
              <Radio.Button value="1">Trimestre 1</Radio.Button>
              <Radio.Button value="2">Trimestre 2</Radio.Button>
              <Radio.Button value="3">Trimestre 3</Radio.Button>
            </Radio.Group>
            <div style={{ display: "flex", gap: "0px", fontSize: "0.65rem", color: "#8b5cf6", fontWeight: 500 }}>
              <span style={{ width: "68px" }}></span>
              <span style={{
                borderBottom: "1.5px dashed #c4b5fd",
                padding: "0 24px 1px",
                textAlign: "center",
              }}>Semestre I</span>
              <span style={{
                borderBottom: "1.5px dashed #c4b5fd",
                padding: "0 14px 1px",
                textAlign: "center",
                marginLeft: "2px",
              }}>Semestre II</span>
            </div>
          </div>
        )}
      </div>

      {haveConract && (
        <Subjects
          data={subjecData}
          showAllSubjects={showAllSubjects}
          overloaded={overloadedQ1 || overloadedQ2 || overloadedQ3}
          emptyHours={
            ((usedHoursQ1 === "0" && selectedQuarter === "q1") ||
              (usedHoursQ2 === "0" && selectedQuarter === "q2") ||
              (usedHoursQ3 === "0" && selectedQuarter === "q3") ||
              (usedHoursQ1 === "0" && usedHoursQ2 === "0" && usedHoursQ3 === "0")) &&
            !showAllSubjects
          }
        />
      )}
    </div>
  );
}

