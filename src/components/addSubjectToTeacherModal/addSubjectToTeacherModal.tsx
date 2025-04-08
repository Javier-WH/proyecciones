import React, { useEffect, useState, useContext } from "react";
import { Button, Modal, Select, Radio, Tag, Switch } from "antd";
import type { RadioChangeEvent } from "antd";
import { Quarter } from "../../interfaces/teacher";
import { Subject } from "../../interfaces/subject";
import { CloseCircleOutlined } from "@ant-design/icons";
import useSetSubject from "../../hooks/useSetSubject";
import { Teacher } from "../../interfaces/teacher";
import SubjectTeacherInfo from "./subjectTeacherInfo";
import malePlaceHolder from "../../assets/malePlaceHolder.svg";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

interface optionsInterface {
  value: string;
  label: string;
  key: string;
  pnf?: string;
  pnfId?: string;
  turno?: string;
  seccion?: string;
  trayecto?: string;
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
  teachers: Quarter | null;
  setTeachers: React.Dispatch<React.SetStateAction<Quarter | null>>;
  selectedTeacerId: string | null;
  subjects: Array<Subject> | null;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  selectedQuarter: "q1" | "q2" | "q3";
  setSelectedQuarter: React.Dispatch<React.SetStateAction<"q1" | "q2" | "q3">>;
  handleTeacherChange: (data: Quarter) => void;
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
  const { subjectColors } = useContext(MainContext) as MainContextValues;
  const [_loading, setLoading] = useState(false);
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

  const getTeacherData = (teacherId: string | null | undefined): Teacher | null => {
    if (!teachers) return null;
    return teachers.q1.find((teacher) => teacher.id === teacherId) || null;
  };

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
    const t_index = teachers[selectedQuarter].findIndex((teacher) => teacher.id === selectedTeacerId);
    setTeacherIndex(t_index);

    const teacherPerfil = new Set(teachers[selectedQuarter][t_index]?.perfil ?? []);
    if (perfilOption === "perfil") {
      subjectsData = subjectsData.filter((subject) => teacherPerfil.has(subject.subjectId));
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

    //console.log(subjectsData);
    setOptions(subjectsData);
  }, [
    subjects,
    perfilOption,
    teachers,
    selectedTeacerId,
    overLoad,
    selectedQuarter,
    filterByQuarter,
    showUnasigned,
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

  const getAsignedTeacherInfo = ({ teacher, title }: { teacher: Teacher | null; title: string }) => {
    const style: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      width: "300px",
      height: "70px",
      alignContent: "center",
      justifyContent: "center",
    };

    if (!teacher) {
      return (
        <div style={style}>
          <span>{title}</span>
          <span>No hay docente asignado</span>
        </div>
      );
    }

    return (
      <div style={style}>
        <span>{title}</span>
        <span>{`${teacher.name} ${teacher.lastName}`}</span>
        <span>{`C.I. ${teacher.ci}`}</span>
      </div>
    );
  };

  return (
    <>
      <Modal
        width={1000}
        style={{
          maxWidth: "1200px",
          minWidth: "800px",
          width: "100vw",
        }}
        open={open}
        title="Materias disponibles para el docente"
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type="dashed">
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            //loading={loading}
            onClick={handleOk}
            disabled={selectedOption === null}>
            Agregar
          </Button>,
        ]}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={malePlaceHolder} width={120} alt="" />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: "20px" }}>
            <span style={{ fontWeight: "bold" }}>
              {`${teachers?.[selectedQuarter][teacherIndex ?? 0]?.name ?? ""} 
            ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.lastName ?? ""}`}
            </span>
            <span>{`C.I.: ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.ci ?? ""}`}</span>
            <span>{`Carga horaria: ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.partTime ?? ""}`}</span>
            <span>
              <span>{`Horas asignadas: `}</span>
              <>
                <span style={overloadStyle(overloadedQ1)}>{usedHoursQ1}</span>/
                <span style={overloadStyle(overloadedQ2)}>{usedHoursQ2}</span>/
                <span style={overloadStyle(overloadedQ3)}>{usedHoursQ3}</span>
              </>
            </span>
            <span>
              <span>{`Hora disponibles: `}</span>
              <>
                <span>{aviableHoursQ1}</span>/<span>{aviableHoursQ2}</span>/<span>{aviableHoursQ3}</span>
              </>
            </span>
          </div>
        </div>

        <br />
        <div style={{ display: "flex", columnGap: "5px" }}>
          <Button
            style={{ width: "150px" }}
            type={filterByQuarter ? "primary" : "default"}
            onClick={() => {
              setFilterByQuarter(!filterByQuarter);
              setOverLoad(false);
            }}>
            {filterByQuarter ? "Mostrar todas" : "Filtrar por trimestre"}
          </Button>
          {filterByQuarter && (
            <div style={{ display: "flex", columnGap: "5px" }}>
              <Select
                value={selectedQuarter}
                style={{ width: 300 }}
                options={[
                  { value: "q1", label: "Primer Trimestre" },
                  { value: "q2", label: "Segundo Trimestre" },
                  { value: "q3", label: "Tercer Trimestre" },
                ]}
                onChange={handleChangeQuarterSelector}
              />
              <div>
                <Switch onChange={() => setOverLoad(!overLoad)} value={overLoad} />
                <span style={{ marginLeft: "10px" }}>Sobrecarga de horas</span>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            alignItems: "end",
            marginBottom: "5px",
            marginTop: "30px",
          }}>
          <div
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Switch onChange={() => setShowUnasigned(!showUnasigned)} value={showUnasigned} />
              <span style={{ marginLeft: "10px" }}>Mostrar solo materias no asignadas</span>
            </div>
            <Radio.Group
              options={optionsWithDisabled}
              onChange={onChangeRadio}
              value={perfilOption}
              optionType="button"
              buttonStyle="solid"
            />
          </div>

          <br />

          <Select
            optionFilterProp="label"
            placeholder="Selecciona una materia"
            size="large"
            onChange={handleChange}
            style={{ width: "100%" }}
            options={options}
            value={selectedOption}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            disabled={options.length === 0 || selectedTeacerId === null}
            optionRender={(option) => {
              const data = option.data;
              const pnfid = option.data.pnfId;
              const color = pnfid ? subjectColors?.[pnfid] ?? "#001529" : "#001529";
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "10px auto",
                    width: "100%",
                    columnGap: "10px",
                  }}>
                  <div style={{ backgroundColor: color }}></div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      borderBottom: "1px solid rgba(189, 223, 230, 0.47)",
                      paddingBottom: "10px",
                    }}>
                    <h4 style={{ margin: 0 }}>{data.label}</h4>
                    <div>
                      <Tag>{data.pnf}</Tag>
                      <Tag>{`sección: ${data.turno ? data.turno[0] : ""}-0${data.seccion}`}</Tag>
                      <Tag>{`horas: ${data.hours?.q1} / ${data.hours?.q2} / ${data.hours?.q3}`}</Tag>
                    </div>

                    <SubjectTeacherInfo teacher={data.teacher || {}} />
                  </div>
                </div>
              );
            }}
          />

          <div style={{ width: "100%", paddingLeft: "20px", visibility: erroMessage ? "visible" : "hidden" }}>
            <Tag icon={<CloseCircleOutlined />} color="error">
              {erroMessage}
            </Tag>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddSubjectToTeacherModal;

