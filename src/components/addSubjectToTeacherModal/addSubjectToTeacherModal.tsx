import React, { useEffect, useState } from "react";
import { Button, Modal, Select, Radio, Tag, Switch, message } from "antd";
import type { RadioChangeEvent } from "antd";
import { Quarter } from "../../interfaces/teacher";
import { Subject } from "../../interfaces/subject";
import { CloseCircleOutlined } from "@ant-design/icons";
import useSetSubject from "../../hooks/useSetSubject";
import { Teacher } from "../../interfaces/teacher";

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
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string; key: string }[]>([]);
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
    let subjectsData = subjects.map((subject, index) => ({
      //value: `${subject.id}:${subject.pensum_id}:${subject.seccion}:${subject.trayectoName}:${subject.turnoName}:${index}`,
      value: subject.innerId,
      label: `${subject.subject} (${subject.pnf} - Sección ${subject.turnoName[0]}-0${subject.seccion} - Trayecto ${subject.trayectoName})`,
      key: `${subject.id} ${subject.pensum_id} ${subject.seccion} ${index}`,
      subjectId: subject.id,
      quarters: Object.keys(subject.quarter),
      asigned: subject.quarter,
    }));
    const t_index = teachers[selectedQuarter].findIndex((teacher) => teacher.id === selectedTeacerId);
    setTeacherIndex(t_index);

    const teacherPerfil = new Set(teachers[selectedQuarter][t_index]?.perfil ?? []);
    if (perfilOption === "perfil") {
      subjectsData = subjectsData.filter((subject) => teacherPerfil.has(subject.subjectId));
    }
    //las horas que tiene usadas el profesor
    const tehacherLoad = teachers[selectedQuarter][t_index]?.load
      ?.map((subject) => Number(subject.hours))
      .reduce((acc, curr) => Number(acc) + Number(curr), 0);

    //maximo de horas que puede tener el profesor
    const maxHours = teachers[selectedQuarter][t_index]?.partTime;

    ///// FILTRADO DE HORAS DISPONIBLES
    if (!overLoad) {
      subjectsData = subjectsData.filter((subject) => {
        const index = subjects.findIndex((s) => s.id === subject.subjectId);
        const subjectHourNumber = Number.parseInt(subjects[index]?.hours.toString());
        const teacherLoadNumber = Number.parseInt(tehacherLoad?.toString() ?? "0");
        const maxHoursNumber = Number.parseInt(maxHours?.toString());

        // Validar si los valores son NaN
        if (isNaN(teacherLoadNumber) || isNaN(subjectHourNumber) || isNaN(maxHoursNumber)) {
          return false;
        }
        return teacherLoadNumber + subjectHourNumber <= maxHoursNumber;
      });
    }
    if (showUnasigned) {
      subjectsData = subjectsData.filter((subject) => {
        const q1Value = subject.asigned.q1;
        const q2Value = subject.asigned.q2;
        const q3Value = subject.asigned.q2;
        return q1Value === null || q2Value === null || q3Value === null;
      });
    }

    //filtrado por trimestre
    if (filterByQuarter) {
      subjectsData = subjectsData.filter((subject) => subject.quarters.includes(selectedQuarter));
    }

    // console.log(subjectsData);
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

  return (
    <>
      <Modal
        //width={800}
        style={{
          maxWidth: "1200px",
          minWidth: "800px",
          width: "80vw",
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: "bold" }}>
            {`${teachers?.[selectedQuarter][teacherIndex ?? 0]?.name ?? ""} 
            ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.lastName ?? ""}`}
          </span>
          <span>{`C.I.: ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.ci ?? ""}`}</span>
          <span>{`carga horaria: ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.partTime ?? ""}`}</span>
          <span>
            <span>{`horas asignadas: `}</span>
            <>
              <span style={overloadStyle(overloadedQ1)}>{usedHoursQ1}</span>/
              <span style={overloadStyle(overloadedQ2)}>{usedHoursQ2}</span>/
              <span style={overloadStyle(overloadedQ3)}>{usedHoursQ3}</span>
            </>
          </span>
          <span>
            <span>{`hora disponibles: `}</span>
            <>
              <span>{aviableHoursQ1}</span>/<span>{aviableHoursQ2}</span>/<span>{aviableHoursQ3}</span>
            </>
          </span>
        </div>

        <br />
        <div style={{ display: "flex", columnGap: "5px" }}>
          <Button
            style={{ width: "150px" }}
            type={filterByQuarter ? "primary" : "default"}
            onClick={() => {
              setFilterByQuarter(!filterByQuarter);
            }}>
            {filterByQuarter ? "Mostrar todas" : "Filtrar por trimestre"}
          </Button>
          {filterByQuarter && (
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
              <Switch onChange={() => setOverLoad(!overLoad)} value={overLoad} />
              <span style={{ marginLeft: "10px" }}>Sobrecarga de horas</span>
            </div>
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

