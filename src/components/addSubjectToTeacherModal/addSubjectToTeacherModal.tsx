import React, { useEffect, useState } from "react";
import { Button, Modal, Select, Radio, Tag, Switch } from "antd";
import type { RadioChangeEvent } from "antd";
import { Quarter } from "../../interfaces/teacher";
import { Subject } from "../../interfaces/subject";
import { CloseCircleOutlined } from "@ant-design/icons";
import useSetSubject from "../../hooks/useSetSubject";

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
}> = ({
  open,
  setOpen,
  teachers,
  selectedTeacerId,
  subjects,
  selectedQuarter,
  setSelectedQuarter,
  handleTeacherChange,
  handleSubjectChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string; key: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [perfilOption, setPerfilOption] = useState("perfil");
  const [erroMessage, setErrorMessage] = useState<string | null>(null);
  const [overLoad, setOverLoad] = useState(false);
  const [teacherIndex, setTeacherIndex] = useState(0);
  const { addSubjectToTeacher } = useSetSubject({
    subjectArray: subjects ?? [],
    teacherArray: teachers ?? { q1: [], q2: [], q3: [] },
  });

  useEffect(() => {
    if (!subjects || !teachers || !selectedTeacerId) return;

    //obtengo la lista de asignaturas
    let subjectsData = subjects.map((subject, index) => ({
      value: subject.innerId,
      label: `${subject.subject} (${subject.pnf} - Sección ${subject.turnoName[0]}-0${subject.seccion} - Trayecto ${subject.trayectoName})`,
      key: `${subject.id} ${subject.pensum_id} ${subject.seccion} ${index}`,
      subjectId: subject.id,
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

    //filtrado por trimestre
    subjectsData = subjectsData.filter((subject) => {
      const index = subjects.findIndex((s) => s.id === subject.subjectId);
      const subjectQuarter = subjects[index]?.quarter;
      const quarter = selectedQuarter === "q1" ? 1 : selectedQuarter === "q2" ? 2 : 3;
      return subjectQuarter && subjectQuarter.includes(quarter);
    });

    // console.log(subjectsData);
    setOptions(subjectsData);
  }, [subjects, perfilOption, teachers, selectedTeacerId, overLoad, selectedQuarter]);

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
    if (selectedOption === null || selectedTeacerId === null) {
      return;
    }
    const { teacherArray, subjectArray } = addSubjectToTeacher({
      subjectId: selectedOption,
      teacherId: selectedTeacerId ?? "",
    });
    handleTeacherChange(teacherArray);
    handleSubjectChange(subjectArray);
    closeModal();
  };

  const closeModal = () => {
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
        title={`Materias disponibles para el docente ${
          teachers?.[selectedQuarter][teacherIndex ?? 0]?.name ?? ""
        } ${teachers?.[selectedQuarter][teacherIndex ?? 0]?.lastName ?? ""}`}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type="dashed">
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleOk}
            disabled={selectedOption === null}>
            Agregar
          </Button>,
        ]}>
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

