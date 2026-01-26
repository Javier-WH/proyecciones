/* eslint-disable react-hooks/exhaustive-deps */
import { Subject } from "../../../interfaces/subject";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { useContext, useEffect, useState } from "react";
import { Button, message, Select, Tag } from "antd";
import SubjectTeacherInfo from "../../addSubjectToTeacherModal/subjectTeacherInfo";
import { FaUserPen } from "react-icons/fa6";
import { TbTopologyStar3 } from "react-icons/tb";
import AddSubjectToTeacherModal from "./addTeacherSubject";
import { normalizeText } from "../../../utils/textFilter";

interface props {
  searchByUserPerfil: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}
function unasignedSubject(obj: { q1?: string | null; q2?: string | null; q3?: string | null }): boolean {
  return Object.values(obj).some((value) => value === null);
}

export default function SubjectTab({ searchByUserPerfil }: props) {
  const { subjects, subjectColors, teachers, setEditSubjectQuarter, userData, userPNF, isAuthenticated } =
    useContext(MainContext) as MainContextValues;
  const [subjectList, setSubjectList] = useState<Subject[]>();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | undefined>(undefined);
  const [subjectsOptions, setSubjectsOptions] = useState<SelectOption[]>([]);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<string | undefined>(undefined);
  const [showUnasignedSubject, setShowUnasignedSubject] = useState<boolean>(false);
  const [trayectoOptions, setTrayectoOptions] = useState<SelectOption[]>([]);
  const [selectedTrayectoOption, setSelectedTrayectoOption] = useState<string | undefined>(undefined);
  const [turnoOptions, setTurnoOptions] = useState<SelectOption[]>([]);
  const [selectedTurnoOption, setSelectedTurnoOption] = useState<string | undefined>(undefined);

  // limpia los selectores
  useEffect(() => {
    setSelectedPnf(undefined);
  }, [searchByUserPerfil]);

  // se llenan filtros
  useEffect(() => {
    if (!subjects) return;

    let filteredSubjects = JSON.parse(JSON.stringify(subjects)) as Subject[];

    if (searchByUserPerfil) {
      const pnfId = sessionStorage.getItem("userPNF")?.replace(/"/g, "");
      filteredSubjects = filteredSubjects.filter((subject) => subject.pnfId === pnfId);
    }

    if (selectedPnf) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.pnfId === selectedPnf);
    }

    if (selectedSubjectOption) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.subject === selectedSubjectOption);
    }

    if (selectedTrayectoOption) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.trayectoId === selectedTrayectoOption);
    }

    if (selectedTurnoOption) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.turnoName === selectedTurnoOption);
    }

    if (showUnasignedSubject) {
      filteredSubjects = filteredSubjects.filter((subject) => {
        const quarter = subject.quarter;
        if (unasignedSubject(quarter)) {
          return subject;
        }
      });
    }

    // Hide linked subjects
    filteredSubjects = filteredSubjects.filter(student => !student.linkedToSection);

    setSubjectList(filteredSubjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchByUserPerfil,
    subjects,
    selectedPnf,
    selectedSubjectOption,
    showUnasignedSubject,
    selectedTrayectoOption,
    selectedTurnoOption,
    userPNF,
    isAuthenticated,
  ]);

  // llena nos selectores de busqueda
  useEffect(() => {
    if (!subjects) return;

    // llena los pnf
    const uniquePnf = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.pnfId === subject.pnfId)
    );

    const pnfList = uniquePnf?.map((subject) => {
      return {
        value: subject.pnfId,
        label: subject.pnf,
      };
    });
    setPnfOptions(pnfList as SelectOption[]);

    // llena los trayectos
    const uniqueTrayectos = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.trayectoId === subject.trayectoId)
    );

    const trayectoList = uniqueTrayectos?.map((subject) => {
      return {
        value: subject.trayectoId,
        label: subject.trayectoName,
      };
    });
    setTrayectoOptions(trayectoList as SelectOption[]);

    const turnoList = Array.from(new Set(subjects?.map((subject) => subject.turnoName) || [])).map(
      (subject) => ({
        value: subject,
        label: subject,
      })
    );
    setTurnoOptions(turnoList as SelectOption[]);
  }, [subjects]);

  // llena el selector de materia condicional
  useEffect(() => {
    if (!subjects) return;
    if (!selectedTrayectoOption) {
      const subjectList = Array.from(new Set(subjects?.map((subject) => subject.subject) || [])).map(
        (subject) => ({
          value: subject,
          label: subject,
        })
      );
      setSubjectsOptions(subjectList as SelectOption[]);
      return;
    }

    const subjectList = Array.from(
      new Set(
        subjects
          ?.filter((subject) => subject.trayectoId === selectedTrayectoOption)
          .map((subject) => subject.subject) || []
      )
    ).map((subject) => ({
      value: subject,
      label: subject,
    }));
    setSubjectsOptions(subjectList as SelectOption[]);
  }, [selectedTrayectoOption]);

  const handleChangeTeacher = (subject: Subject) => {
    if (!userData?.su && userPNF !== subject.pnfId) {
      message.error("No puede asignar materias de otros programas");
      return;
    }
    setSelectedSubject(subject);
  };

  return (
    <>
      <AddSubjectToTeacherModal subject={selectedSubject} setSelectedSubject={setSelectedSubject} />
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "10px",
        }}>
        {/* Filters Header */}
        <div
          style={{
            backgroundColor: "white",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            border: "1px solid #f0f0f0",
          }}>
          <Button
            size="large"
            type={showUnasignedSubject ? "primary" : "default"}
            onClick={() => setShowUnasignedSubject(!showUnasignedSubject)}
            style={{ width: "160px" }}>
            {showUnasignedSubject ? "Mostrar todas" : "Mostrar sin asignar"}
          </Button>

          <Select
            allowClear
            showSearch
            size="large"
            style={{ width: 220 }}
            placeholder="Filtrar por trayecto"
            optionFilterProp="label"
            filterOption={(input, option) =>
              normalizeText(option?.label ?? "").includes(normalizeText(input))
            }
            filterSort={(optionA, optionB) =>
              normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
            }
            options={trayectoOptions}
            onChange={(value) => {
              setSelectedTrayectoOption(value);
            }}
            value={selectedTrayectoOption}
          />

          <Select
            allowClear
            showSearch
            size="large"
            style={{ flex: 1, minWidth: "280px" }}
            placeholder="Filtrar por materia"
            optionFilterProp="label"
            filterOption={(input, option) =>
              normalizeText(option?.label ?? "").includes(normalizeText(input))
            }
            filterSort={(optionA, optionB) =>
              normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
            }
            options={subjectsOptions}
            onChange={(value) => {
              setSelectedSubjectOption(value);
            }}
            value={selectedSubjectOption}
          />

          <Select
            allowClear
            showSearch
            size="large"
            style={{ width: 180 }}
            placeholder="Filtrar por turno"
            optionFilterProp="label"
            filterOption={(input, option) =>
              normalizeText(option?.label ?? "").includes(normalizeText(input))
            }
            filterSort={(optionA, optionB) =>
              normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
            }
            options={turnoOptions}
            onChange={(value) => {
              setSelectedTurnoOption(value);
            }}
            value={selectedTurnoOption}
          />

          {!searchByUserPerfil && (
            <Select
              allowClear
              showSearch
              size="large"
              style={{ width: 240 }}
              placeholder="Filtrar por PNF"
              optionFilterProp="label"
              filterOption={(input, option) =>
                normalizeText(option?.label ?? "").includes(normalizeText(input))
              }
              filterSort={(optionA, optionB) =>
                normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
              }
              options={pnfOptions}
              onChange={(value) => {
                setSelectedPnf(value);
              }}
              value={selectedPnf}
            />
          )}
        </div>

        {/* List Container */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflowY: "auto",
            minHeight: 0,
            paddingBottom: "20px",
          }}>
          {subjectList?.map((subject) => {
            const color = subjectColors?.[subject.pnfId] || "#1890ff";

            const teacher = {
              q1: teachers?.find((teacher) => teacher.id === subject.quarter.q1) || null,
              q2: teachers?.find((teacher) => teacher.id === subject.quarter.q2) || null,
              q3: teachers?.find((teacher) => teacher.id === subject.quarter.q3) || null,
            };

            return (
              <div
                key={subject.innerId}
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  border: "1px solid #f0f0f0",
                  borderLeft: `5px solid ${color}`,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  transition: "all 0.2s ease",
                  position: "relative",
                  minHeight: "100px",
                }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#1f1f1f",
                        lineHeight: 1.2,
                        textTransform: "uppercase",
                      }}>
                      {subject.subject}
                    </h3>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <Tag color="cyan" style={{ margin: 0 }}>
                        {subject.pnf}
                      </Tag>
                      <Tag style={{ margin: 0 }}>{subject.trayectoName}</Tag>
                      <Tag style={{ margin: 0 }}>Sec: {subject.turnoName[0]}-{subject.seccion}</Tag>
                      <Tag color="purple" style={{ margin: 0 }}>
                        Horas: {subject?.hours?.q1 || 0} / {subject?.hours?.q2 || 0} / {subject?.hours?.q3 || 0}
                      </Tag>
                    </div>
                  </div>

                  <div style={{ marginTop: "4px" }}>
                    <SubjectTeacherInfo teacher={teacher} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                  <Button
                    onClick={() => handleChangeTeacher(subject)}
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<FaUserPen />}
                    title="Asignar Docente"
                  />

                  {(subject?.quarter?.q1 != null ||
                    subject?.quarter?.q2 != null ||
                    subject?.quarter?.q3 != null) && (
                      <Button
                        onClick={() => {
                          if (!userData?.su && userPNF !== subject.pnfId) {
                            message.error("No puede modificar materias asignadas de otros programas");
                            return;
                          }
                          setEditSubjectQuarter(subject);
                        }}
                        shape="circle"
                        size="large"
                        style={{ color: "#faad14", borderColor: "#faad14" }}
                        icon={<TbTopologyStar3 />}
                        title="Editar Asignación"
                      />
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

