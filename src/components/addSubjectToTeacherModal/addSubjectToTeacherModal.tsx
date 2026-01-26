import React, { useEffect, useState, useContext } from "react";
import { Button, Modal, Select, Radio, Tag, Switch, message } from "antd";
import type { RadioChangeEvent } from "antd";
import { Subject } from "../../interfaces/subject";
import { CloseCircleOutlined } from "@ant-design/icons";
import useSetSubject from "../../hooks/useSetSubject";
import { Teacher } from "../../interfaces/teacher";
import SubjectTeacherInfo from "./subjectTeacherInfo";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { normalizeText } from "../../utils/textFilter";
import Photo from "../photo/photo";
import { teacherCanTeachSubject } from "../../utils/subjectProfile";

interface optionsInterface {
  value: string;
  label: string;
  key: string;
  pnf?: string;
  pnfId?: string;
  turno?: string;
  seccion?: string;
  trayecto?: string;
  linkedToSection?: string;
  hours?: {
    q1?: number | null;
    q2?: number | null;
    q3?: number | null;
  };
  teacher?: {
    q1?: Teacher | null;
    q2?: Teacher | null;
    q3?: Teacher | null;
  };
  subjectId?: string;
  quarters?: string[];
  asigned?: {
    q1?: string | null;
    q2?: string | null;
    q3?: string | null;
  };
}

const AddSubjectToTeacherModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  teachers: Teacher[] | null;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[] | null>>;
  selectedTeacerId: string | null;
  subjects: Array<Subject> | null;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  selectedQuarter: "q1" | "q2" | "q3";
  setSelectedQuarter: React.Dispatch<React.SetStateAction<"q1" | "q2" | "q3">>;
  handleSubjectChange: (data: Subject[]) => void;
  selectedTeacher: Teacher | null;
}> = ({
  open,
  setOpen,
  teachers,
  selectedTeacerId,
  subjects,
  selectedQuarter,
  setSelectedQuarter,
  handleSubjectChange,
  selectedTeacher,
}) => {
    const { subjectColors, userData, userPNF } = useContext(MainContext) as MainContextValues;
    const [, setLoading] = useState(false);
    const [options, setOptions] = useState<optionsInterface[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [perfilOption, setPerfilOption] = useState("perfil");
    const [erroMessage, setErrorMessage] = useState<string | null>(null);
    const [overLoad, setOverLoad] = useState(false);
    const [showUnasigned, setShowUnasigned] = useState(false);
    const [teacherIndex, setTeacherIndex] = useState(0);
    const { addSubjectToTeacher, getTeacherHoursData } = useSetSubject(subjects || []);
    const [filterByQuarter, setFilterByQuarter] = useState(false);
    const [usedHoursQ1, setUsedHoursQ1] = useState("");
    const [usedHoursQ2, setUsedHoursQ2] = useState("");
    const [usedHoursQ3, setUsedHoursQ3] = useState("");
    const [aviableHoursQ1, setAviableHoursQ1] = useState("");
    const [aviableHoursQ2, setAviableHoursQ2] = useState("");
    const [aviableHoursQ3, setAviableHoursQ3] = useState("");
    const [overloadedQ1, setOverloadedQ1] = useState(false);
    const [overloadedQ2, setOverloadedQ2] = useState(false);
    const [overloadedQ3, setOverloadedQ3] = useState(false);
    const [trayectoOptions, setTrayectoOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedTrayecto, setSelectedTrayecto] = useState<string | null>(null);

    const getTeacherData = (teacherId: string | null | undefined): Teacher | null => {
      if (!teachers) return null;
      return teachers.find((teacher) => teacher.id === teacherId) || null;
    };

    useEffect(() => {
      if (!subjects) return;

      const uniqueTrayectos = new Set();
      const options: { label: string; value: string }[] = [];

      subjects.forEach((subject) => {
        if (!uniqueTrayectos.has(subject.trayectoId)) {
          uniqueTrayectos.add(subject.trayectoId);
          options.push({
            label: subject.trayectoName,
            value: subject.trayectoName,
          });
        }
      });

      setTrayectoOptions(options);
    }, [subjects]);

    useEffect(() => {
      if (!selectedTeacher) return;

      const response = getTeacherHoursData(selectedTeacher);
      if (response.error) {
        console.log(response.message);
        return;
      }
      if (response.data) {
        const { q1, q2, q3 } = response.data;
        setUsedHoursQ1(q1?.usedHours || "");
        setUsedHoursQ2(q2?.usedHours || "");
        setUsedHoursQ3(q3?.usedHours || "");
        setAviableHoursQ1(q1?.aviableHours || "");
        setAviableHoursQ2(q2?.aviableHours || "");
        setAviableHoursQ3(q3?.aviableHours || "");
        setOverloadedQ1(q1?.overloaded || false);
        setOverloadedQ2(q2?.overloaded || false);
        setOverloadedQ3(q3?.overloaded || false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTeacerId, subjects]);

    useEffect(() => {
      if (!subjects || !teachers || !selectedTeacerId) return;

      //obtengo la lista de asignaturas
      let subjectsData = subjects.map((subject) => {
        const asigned: { q1?: string | null; q2?: string | null; q3?: string | null } = {};
        if (subject.quarter.q1 !== undefined) asigned.q1 = subject.quarter.q1;
        if (subject.quarter.q2 !== undefined) asigned.q2 = subject.quarter.q2;
        if (subject.quarter.q3 !== undefined) asigned.q3 = subject.quarter.q3;
        return {
          value: subject.innerId,
          label: subject.subject,
          key: `${subject.id} ${subject.pensum_id} ${subject.seccion} ${subject.innerId}`,
          pnf: subject.pnf,
          pnfId: subject.pnfId,
          turno: subject.turnoName,
          seccion: subject.seccion,
          trayecto: subject.trayectoName,
          linkedToSection: subject.linkedToSection,
          subjectId: subject.id,
          quarters: Object.keys(subject.quarter),
          asigned: asigned,
          hours: subject.hours,
          teacher: {
            q1: getTeacherData(subject.quarter.q1),
            q2: getTeacherData(subject.quarter.q2),
            q3: getTeacherData(subject.quarter.q3),
          },
        };
      });
      const t_index = teachers.findIndex((teacher) => teacher.id === selectedTeacerId);
      setTeacherIndex(t_index);

      const teacherPerfil = teachers[t_index]?.perfil ?? [];

      // excluir materias vinculadas (solo se muestran las secciones principales)
      subjectsData = subjectsData.filter((subject) => !subject.linkedToSection);

      // solo se muestran las materias del PNF del docente si no es superusuario
      if (!userData?.su) {
        subjectsData = subjectsData.filter((subject) => subject.pnfId === userPNF);
      }

      if (perfilOption === "perfil") {
        subjectsData = subjectsData.filter(
          (subject) =>
            teacherCanTeachSubject(teacherPerfil, subject.subjectId, subject.label)
        );
      }

      ///// FILTRADO DE HORAS DISPONIBLES
      if (!overLoad && filterByQuarter) {
        if (
          (selectedQuarter === "q1" && overloadedQ1) ||
          (selectedQuarter === "q2" && overloadedQ2) ||
          (selectedQuarter === "q3" && overloadedQ3)
        ) {
          subjectsData = [];
        }
      }

      if (showUnasigned) {
        subjectsData = subjectsData.filter((subject) => {
          if (filterByQuarter) {
            const quarterValue = subject.asigned?.[selectedQuarter];
            return quarterValue === null || quarterValue === undefined;
          }
          const q1Value = subject.asigned.q1;
          const q2Value = subject.asigned.q2;
          const q3Value = subject.asigned.q3;
          return q1Value === null || q2Value === null || q3Value === null;
        });
      }

      //filtrado por trimestre
      if (filterByQuarter) {
        subjectsData = subjectsData.filter((subject) => subject.quarters.includes(selectedQuarter));
      }

      if (selectedTrayecto) {
        subjectsData = subjectsData.filter((subject) => subject.trayecto === selectedTrayecto);
      }
      //console.log(subjectsData);
      setOptions(subjectsData);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      subjects,
      perfilOption,
      teachers,
      selectedTeacerId,
      overLoad,
      selectedQuarter,
      filterByQuarter,
      showUnasigned,
      selectedTrayecto,
    ]);

    //aqui vigilo si existen asignaturas
    useEffect(() => {
      if (!options) return;
      if (options.length === 0) {
        setErrorMessage("No hay asignaturas disponibles para este perfil de profesor");
      } else {
        setErrorMessage(null);
      }
    }, [options]);

    const handleOk = () => {
      setLoading(true);
      //valido para no tener errores mas adelante
      if (
        !teachers ||
        subjects === null ||
        selectedOption === null ||
        teacherIndex === null ||
        selectedQuarter === null
      )
        return;

      // permisos
      const subject = subjects.find((subject) => subject.innerId === selectedOption);
      if (!userData?.su && userPNF !== subject?.pnfId) {
        message.error("No puede asignar materias de otros programas");
        return;
      }

      const addSubjectResponse = addSubjectToTeacher({
        subjectId: selectedOption,
        teacherId: selectedTeacerId,
      });

      if (addSubjectResponse.error) {
        console.log(addSubjectResponse.message);
        return;
      }

      if (addSubjectResponse.data) {
        handleSubjectChange(addSubjectResponse.data);
      }

      //limpio el select
      setSelectedOption(null);
      //cierro el modal
      setLoading(false);
      setOverLoad(false);
      setPerfilOption("perfil");
      setOpen(false);
    };

    const handleCancel = () => {
      setOpen(false);
    };

    const handleChange = (value: string) => {
      setSelectedOption(value);
    };

    const optionsWithDisabled = [
      { label: "Perfil", value: "perfil" },
      { label: "Todas", value: "todas" },
    ];

    const onChangeRadio = ({ target: { value } }: RadioChangeEvent) => {
      setPerfilOption(value);
      setSelectedOption(null);
    };

    const handleChangeQuarterSelector = (value: string) => {
      setSelectedQuarter(value as "q1" | "q2" | "q3");
    };

    const overloadStyle = (overloaded: boolean): React.CSSProperties => {
      return {
        color: overloaded ? "red" : "black",
      };
    };

    return (
      <>
        <Modal
          width={1080}
          style={{ maxWidth: "1300px", minWidth: "800px", width: "100vw" }}
          open={open}
          footer={[
            <Button key="back" onClick={handleCancel} type="dashed">
              Cancelar
            </Button>,
            <Button key="submit" type="primary" onClick={handleOk} disabled={selectedOption === null}>
              Agregar
            </Button>,
          ]}
          title={null}
          closeIcon={false}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              padding: "8px 4px",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "24px",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "110px",
                    height: "110px",
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  }}>
                  <Photo teacher={selectedTeacher} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, textTransform: "uppercase" }}>
                    {`${teachers?.[teacherIndex ?? 0]?.lastName ?? ""} ${teachers?.[teacherIndex ?? 0]?.name ?? ""
                      }`}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "4px 16px" }}>
                    <span style={{ color: "#475467" }}>{`C.I.: ${teachers?.[teacherIndex ?? 0]?.ci ?? ""}`}</span>
                    <span style={{ color: "#475467" }}>{`Carga horaria: ${teachers?.[teacherIndex ?? 0]?.partTime ?? ""
                      }`}</span>
                    <span style={{ color: "#475467" }}>
                      Horas asignadas:
                      <strong style={{ marginLeft: 4 }}>
                        <span style={overloadStyle(overloadedQ1)}>{usedHoursQ1}</span> /
                        <span style={overloadStyle(overloadedQ2)}>{usedHoursQ2}</span> /
                        <span style={overloadStyle(overloadedQ3)}>{usedHoursQ3}</span>
                      </strong>
                    </span>
                    <span style={{ color: "#475467" }}>
                      Horas disponibles:
                      <strong style={{ marginLeft: 4 }}>
                        {aviableHoursQ1} / {aviableHoursQ2} / {aviableHoursQ3}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                <div style={{ fontSize: "0.85rem", color: "#98a2b3" }}>Modo de selección</div>
                <Radio.Group
                  options={optionsWithDisabled}
                  onChange={onChangeRadio}
                  value={perfilOption}
                  optionType="button"
                  buttonStyle="solid"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
              }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#475467" }}>Buscar por trimestre</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    block
                    type={filterByQuarter ? "primary" : "default"}
                    onClick={() => {
                      setFilterByQuarter(!filterByQuarter);
                      setOverLoad(false);
                    }}>
                    {filterByQuarter ? "Mostrar todos" : "Filtrar por trimestre"}
                  </Button>
                  {filterByQuarter && (
                    <Select
                      value={selectedQuarter}
                      style={{ width: "100%" }}
                      options={[
                        { value: "q1", label: "1er Trimestre" },
                        { value: "q2", label: "2do Trimestre" },
                        { value: "q3", label: "3er Trimestre" },
                      ]}
                      onChange={handleChangeQuarterSelector}
                    />
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#475467" }}>Disponibilidad</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    padding: "8px 12px",
                  }}>
                  <Switch onChange={() => setShowUnasigned(!showUnasigned)} checked={showUnasigned} />
                  <span style={{ color: "#475467" }}>Mostrar sólo materias no asignadas</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#475467" }}>Trayecto</span>
                <Select
                  allowClear
                  placeholder="Selecciona un trayecto"
                  style={{ width: "100%" }}
                  options={trayectoOptions}
                  value={selectedTrayecto}
                  disabled={trayectoOptions.length === 0}
                  onChange={(e) => setSelectedTrayecto(e)}
                />
              </div>

              {filterByQuarter && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "0.85rem", color: "#475467" }}>Sobrecarga de horas</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      padding: "8px 12px",
                    }}>
                    <Switch onChange={() => setOverLoad(!overLoad)} checked={overLoad} />
                    <span style={{ color: "#475467" }}>Incluir profesores con horas extra</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Materias disponibles</div>
                  <div style={{ fontSize: "0.8rem", color: "#98a2b3" }}>
                    Filtra o busca por nombre, sección o trayecto
                  </div>
                </div>
                <Tag color={options.length === 0 ? "error" : "blue"}>{`${options.length} resultados`}</Tag>
              </div>

              <Select
                optionFilterProp="label"
                placeholder="Selecciona una materia"
                size="large"
                onChange={handleChange}
                style={{ width: "100%" }}
                options={options}
                value={selectedOption}
                showSearch
                filterOption={(input, option) => normalizeText(option?.label ?? "").includes(normalizeText(input))}
                disabled={options.length === 0 || selectedTeacerId === null}
                optionRender={(option) => {
                  const data = option.data;
                  const pnfid = option.data.pnfId;
                  const color = pnfid ? subjectColors?.[pnfid] ?? "#2563eb" : "#2563eb";
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "8px auto",
                        width: "100%",
                        columnGap: "12px",
                      }}>
                      <div style={{ backgroundColor: color, borderRadius: "999px" }}></div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
                          paddingBottom: "12px",
                          gap: "6px",
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ margin: 0, fontSize: "1rem" }}>{data.label}</h4>
                          <Tag>{`Horas ${data.hours?.q1} / ${data.hours?.q2} / ${data.hours?.q3}`}</Tag>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          <Tag>{data.pnf}</Tag>
                          <Tag>{`Sección: ${data.turno ? data.turno[0] : ""}-0${data.seccion}`}</Tag>
                          {data.trayecto && <Tag>{data.trayecto}</Tag>}
                        </div>
                        <SubjectTeacherInfo teacher={data.teacher || {}} />
                      </div>
                    </div>
                  );
                }}
              />

              <div style={{ width: "100%", visibility: erroMessage ? "visible" : "hidden" }}>
                <Tag icon={<CloseCircleOutlined />} color="error">
                  {erroMessage}
                </Tag>
              </div>
            </div>
          </div>
        </Modal>
      </>
    );
  }

export default AddSubjectToTeacherModal;

