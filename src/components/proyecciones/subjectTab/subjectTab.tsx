import { Subject } from "../../../interfaces/subject";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { useContext, useEffect, useState } from "react";
import { Button, Input, Select, Tag } from "antd";
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
  const { subjects, subjectColors, teachers, setEditSubjectQuarter } = useContext(
    MainContext
  ) as MainContextValues;
  const [subjectList, setSubjectList] = useState<Subject[]>();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | undefined>(undefined);
  const [subjectsOptions, setSubjectsOptions] = useState<SelectOption[]>([]);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<string | undefined>(undefined);
  const [showUnasignedSubject, setShowUnasignedSubject] = useState<boolean>(false);

  // limpia los selectores
  useEffect(() => {
    setSelectedPnf(undefined);
  }, [searchByUserPerfil]);
  // filtros
  useEffect(() => {
    if (!subjects) return;

    let filteredSubjects = [...subjects];

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
  }, [searchByUserPerfil, subjects, selectedPnf, selectedSubjectOption, showUnasignedSubject, subjectList]);

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

    // llena las materias
    const subjectList = Array.from(new Set(subjects?.map((subject) => subject.subject) || [])).map(
      (subject) => ({
        value: subject,
        label: subject,
      })
    );
    setSubjectsOptions(subjectList as SelectOption[]);
  }, [subjects]);

  const handleChangeTeacher = (subject: Subject) => {
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
          top: "55px",
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
            style={{ width: 200 }}
            placeholder="Filtrar por materia"
            optionFilterProp="label"
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
            }
            options={subjectsOptions}
            onChange={(value) => {
              setSelectedSubjectOption(value);
            }}
            value={selectedSubjectOption}
          />

          {!searchByUserPerfil && (
            <Select
              allowClear
              showSearch
              style={{ width: 200 }}
              placeholder="Filtrar por PNF"
              optionFilterProp="label"
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
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
              q1: teachers?.q1.find((teacher) => teacher.id === subject.quarter.q1) || null,
              q2: teachers?.q2.find((teacher) => teacher.id === subject.quarter.q2) || null,
              q3: teachers?.q3.find((teacher) => teacher.id === subject.quarter.q3) || null,
            };

            return (
              <div
                key={subject.innerId}
                className="subject-tab"
                style={{
                  height: "80px",
                  minHeight: "80px",
                  width: "100%",
                  maxWidth: "1000px",
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
                      onClick={() => setEditSubjectQuarter(subject)}
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

