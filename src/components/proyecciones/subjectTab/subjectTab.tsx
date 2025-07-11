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
          position: "absolute",
          left: "5px",
          right: "5px",
          top: "5px",
          bottom: 0,
        }}>
        <div style={{ display: "flex", gap: "5px" }}>
          <Button
            onClick={() => setShowUnasignedSubject(!showUnasignedSubject)}
            style={{
              width: "140px",
            }}>
            {showUnasignedSubject ? "Mostrar todas" : "Mostrar sin asignar"}
          </Button>

          <Select
            allowClear
            showSearch
            style={{ width: 160 }}
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
            style={{ width: 400 }}
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
            style={{ width: 150 }}
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
              style={{ width: 200 }}
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

        <div
          style={{
            marginTop: "5px",
            display: "flex",
            flexDirection: "column",
            rowGap: "5px",
            height: "calc(100vh - 120px)",
            overflowY: "auto",
          }}>
          {subjectList?.map((subject) => {
            const color = subjectColors?.[subject.pnfId];

            const teacher = {
              q1: teachers?.find((teacher) => teacher.id === subject.quarter.q1) || null,
              q2: teachers?.find((teacher) => teacher.id === subject.quarter.q2) || null,
              q3: teachers?.find((teacher) => teacher.id === subject.quarter.q3) || null,
            };

            return (
              <div
                key={subject.innerId}
                className="subject-tab"
                style={{
                  height: "80px",
                  minHeight: "80px",
                  width: "98%",
                  display: "flex",
                  columnGap: "10px",
                  position: "relative",
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                }}>
                <div style={{ height: "100%", width: "15px", backgroundColor: color }}></div>
                <div>
                  <div style={{ fontWeight: 600 }}>{subject.subject}</div>
                  <div>
                    <Tag>{subject.pnf}</Tag>
                    <Tag>{`${subject?.trayectoName}`}</Tag>
                    <Tag>{`Sección: ${subject.turnoName[0]}-${subject.seccion}`}</Tag>
                    <Tag>{`Horas: ${subject?.hours?.q1 || 0} / ${subject?.hours?.q2 || 0} / ${
                      subject?.hours?.q3 || 0
                    }`}</Tag>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      width: "100%",
                      display: "flex",
                    }}>
                    <SubjectTeacherInfo teacher={teacher} />
                  </div>
                  <Button
                    onClick={() => handleChangeTeacher(subject)}
                    className="subject-tab-button"
                    type="primary"
                    shape="circle"
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "0",
                      bottom: "0",
                      marginTop: "auto",
                      marginBottom: "auto",
                    }}>
                    <FaUserPen />
                  </Button>
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
                      className="subject-tab-button"
                      shape="circle"
                      style={{
                        position: "absolute",
                        right: "50px",
                        top: "0",
                        bottom: "0",
                        marginTop: "auto",
                        marginBottom: "auto",
                      }}>
                      <TbTopologyStar3 />
                    </Button>
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

