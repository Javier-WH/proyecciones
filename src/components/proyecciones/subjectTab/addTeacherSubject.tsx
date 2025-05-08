import React, { useEffect, useState, useContext, Dispatch, SetStateAction } from "react";
import { Button, Modal, Select, Radio, Tag, RadioChangeEvent } from "antd";
import { Subject } from "../../../interfaces/subject";
import useSetSubject, { useSubjectResponseTeacherHours } from "../../../hooks/useSetSubject";

import { Teacher } from "../../../interfaces/teacher";
import SubjectTeacherInfo from "../../addSubjectToTeacherModal/subjectTeacherInfo";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { normalizeText } from "../../../utils/textFilter";

interface AddSubjectToTeacherModalParams {
  subject: Subject | null;
  setSelectedSubject: Dispatch<SetStateAction<Subject | null>>;
}

interface Options {
  label: string;
  value: string;
  teacher: Teacher;
  hours: useSubjectResponseTeacherHours;
}

interface asignedTeacherProps {
  q1: Teacher | null;
  q2: Teacher | null;
  q3: Teacher | null;
}

const optionsWithDisabled = [
  { label: "Perfil", value: "perfil" },
  { label: "Todas", value: "todas" },
];

const AddSubjectToTeacherModal: React.FC<AddSubjectToTeacherModalParams> = ({
  subject,
  setSelectedSubject,
}) => {
  const { subjectColors, teachers, subjects } = useContext(MainContext) as MainContextValues;
  const { getTeacherHoursData, addSubjectToTeacher, removeSubjectFromTeacher } = useSetSubject(
    subjects || []
  );
  const [perfilOption, setPerfilOption] = useState("perfil");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options[]>([]);
  const [selectedOption, setSelectedOption] = useState<Teacher | null>(null);
  const [asignedTeacher, setasignedTeacher] = useState<asignedTeacherProps>({
    q1: null,
    q2: null,
    q3: null,
  });

  useEffect(() => {
    if (!subject) {
      setOpen(false);
      setasignedTeacher({
        q1: null,
        q2: null,
        q3: null,
      });
      setSelectedOption(null);
      setPerfilOption("perfil");
      return;
    }
    setOpen(true);
  }, [subject]);

  useEffect(() => {
    const teacherData: asignedTeacherProps = {
      q1: null,
      q2: null,
      q3: null,
    };
    if (!subject) {
      setasignedTeacher(teacherData);
      return;
    }

    if (subject?.quarter?.q1) {
      const teacherQ1 = teachers?.q1.find((t) => t.id === subject.quarter.q1);
      teacherData.q1 = teacherQ1 ? teacherQ1 : null;
    }

    if (subject?.quarter.q2) {
      const teacherQ2 = teachers?.q2.find((t) => t.id === subject.quarter.q2);
      teacherData.q2 = teacherQ2 ? teacherQ2 : null;
    }

    if (subject?.quarter.q3) {
      const teacherQ3 = teachers?.q3.find((t) => t.id === subject.quarter.q3);
      teacherData.q3 = teacherQ3 ? teacherQ3 : null;
    }

    setasignedTeacher(teacherData);
  }, [subject]);

  useEffect(() => {
    if (!teachers || !subject) return;
    let filteredTeachers = teachers?.q1.map((teacher) => {
      const hours = getTeacherHoursData(teacher);
      return {
        label: `${teacher.lastName} ${teacher.name}`.toUpperCase(),
        value: teacher.id,
        teacher: teacher,
        hours: hours,
      };
    });

    filteredTeachers = filteredTeachers.filter((teacher) => {
      return teacher.teacher.contractTypeId !== null;
    });

    if (perfilOption === "perfil") {
      filteredTeachers = filteredTeachers.filter((teacher) => {
        if (teacher.teacher.perfil.includes(subject?.id)) {
          return teacher;
        }
      });
    }

    setOptions(filteredTeachers);
  }, [teachers, subject, perfilOption]);

  const handleCancel = () => {
    setSelectedSubject(null);
  };

  const handleChange = (value: string) => {
    const selectedTeacher = teachers?.q1.find((t) => t.id === value) || null;
    setSelectedOption(selectedTeacher);
  };

  const handleOk = () => {
    if (!subject || !selectedOption) return;
    const subjectId = subject?.innerId;
    const teacherId = selectedOption?.id;
    addSubjectToTeacher({ subjectId, teacherId });
    setSelectedSubject(null);
  };

  const handleCleanAsignation = () => {
    if (!subject || (!asignedTeacher.q1 && !asignedTeacher.q2 && !asignedTeacher.q3)) return;
    const subjectId = subject?.innerId;
<<<<<<< HEAD
    const teacherIdQ1 = asignedTeacher.q1?.id || null;
    removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ1 });
    const teacherIdQ2 = asignedTeacher.q2?.id || null;
    removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ2 });
    const teacherIdQ3 = asignedTeacher.q3?.id || null;
    removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ3 });
=======

    const teacherIdQ1 = asignedTeacher.q1?.id || null;
    if (teacherIdQ1) {
      removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ1 });
    }

    const teacherIdQ2 = asignedTeacher.q2?.id || null;
    if (teacherIdQ2) {
      removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ2 });
    }

    const teacherIdQ3 = asignedTeacher.q3?.id || null;
    if (teacherIdQ3) {
      removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ3 });
    }
>>>>>>> 1ac01e91f3e3c1835b374733f2084a141260dbce

    setSelectedSubject(null);
  };

  const onChangeRadio = ({ target: { value } }: RadioChangeEvent) => {
    setPerfilOption(value);
    setSelectedOption(null);
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
        title={subject?.subject || "Desconocido"}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button
            disabled={!asignedTeacher.q1 && !asignedTeacher.q2 && !asignedTeacher.q3}
            key="clean"
            onClick={handleCleanAsignation}
            type="dashed">
            Limpiar asignación
          </Button>,
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
        <div style={{ display: "flex", flexDirection: "column", rowGap: "10px" }}>
          <div>
            <Tag>{subject?.pnf}</Tag>
            <Tag>{`${subject?.trayectoName}`}</Tag>
            <Tag>{`Sección: ${subject?.turnoName[0]}-${subject?.seccion}`}</Tag>
            <Tag>{`Horas: ${subject?.hours.q1} / ${subject?.hours.q2} / ${subject?.hours.q3}`}</Tag>
          </div>
          <div
            style={{
              borderTop: `10px solid ${subjectColors?.[subject?.pnfId ?? 0] ?? "pink"}`,
            }}>
            <SubjectTeacherInfo teacher={asignedTeacher} />
          </div>
          <Radio.Group
            style={{ marginLeft: "auto", marginRight: "0" }}
            options={optionsWithDisabled}
            onChange={onChangeRadio}
            value={perfilOption}
            optionType="button"
            buttonStyle="solid"
          />

          <Select
            optionFilterProp="label"
            placeholder="Seleccione un profesor"
            size="large"
            onChange={handleChange}
            style={{ width: "100%" }}
            options={options}
            value={selectedOption?.id}
            showSearch
            filterOption={(input, option) =>
              //(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              normalizeText(option?.label ?? "").includes(normalizeText(input))
            }
            disabled={options.length === 0}
            optionRender={(option) => {
              const teacher = option.data.teacher;
              const hours = option.data.hours.data;
              return (
                <div
                  style={{
                    display: "flex",
                    columnGap: "10px",
                  }}>
                  <img src={malePlaceHolder} alt="" width={80} />
                  <div>
                    <div>{`${teacher.lastName} ${teacher.name}`.toUpperCase()}</div>
                    <div>{`Cédula: ${teacher.ci}`}</div>
                    <div>{`Carga horaria: ${hours?.q1?.totalHours}`}</div>
                    <div>{`Horas asignadas: ${hours?.q1?.usedHours} / ${hours?.q2?.usedHours} / ${hours?.q3?.usedHours}`}</div>
                  </div>
                </div>
              );
            }}
          />
          {options?.length === 0 && (
            <Tag color="warning">No hay profesores que en su perfil puedan dar esta materia</Tag>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AddSubjectToTeacherModal;

