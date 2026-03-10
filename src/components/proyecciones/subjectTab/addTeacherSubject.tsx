/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useContext, Dispatch, SetStateAction } from "react";
import { Button, Modal, Select, Radio, Tag, RadioChangeEvent, Alert } from "antd";
import { Subject } from "../../../interfaces/subject";
import useSetSubject, { useSubjectResponseTeacherHours } from "../../../hooks/useSetSubject";
import Photo from "../../photo/photo";
import { Teacher } from "../../../interfaces/teacher";
import SubjectTeacherInfo from "../../addSubjectToTeacherModal/subjectTeacherInfo";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { normalizeText } from "../../../utils/textFilter";
import { generateSubjectProfileId, teacherCanTeachSubject } from "../../../utils/subjectProfile";

interface AddSubjectToTeacherModalParams {
  subject: Subject | null;
  setSelectedSubject: Dispatch<SetStateAction<Subject | null>>;
}

interface Options {
  label: string;
  value: string;
  teacher: Teacher;
  hours: useSubjectResponseTeacherHours;
  normalizedPerfilEntries: string[];
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

const buildTeacherPerfilEntries = (teacher: Teacher | null | undefined): string[] => {
  if (!teacher) return [];
  const rawEntries =
    (Array.isArray(teacher.perfil) && teacher.perfil.length > 0
      ? teacher.perfil
      : teacher.perfil_name_id?.split(",")) || [];

  return rawEntries
    .map((entry) => entry?.trim())
    .filter(Boolean)
    .map((entry) => generateSubjectProfileId(entry) ?? normalizeText(entry))
    .filter((entry) => Boolean(entry)) as string[];
};

const AddSubjectToTeacherModal: React.FC<AddSubjectToTeacherModalParams> = ({
  subject,
  setSelectedSubject,
}) => {
  const { subjectColors, teachers, subjects, handleSubjectChange } = useContext(
    MainContext
  ) as MainContextValues;
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
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject || !teachers) {
      setOpen(false);
      setasignedTeacher({
        q1: null,
        q2: null,
        q3: null,
      });
      setSelectedOption(null);
      setPerfilOption("perfil");
      setLocalError(null);
      return;
    }
    setOpen(true);
    setLocalError(null);
  }, [subject]);

  useEffect(() => {
    if (!teachers) return;
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
      const teacherQ1 = teachers.find((t) => t.id === subject.quarter.q1);
      teacherData.q1 = teacherQ1 ? teacherQ1 : null;
    }

    if (subject?.quarter.q2) {
      const teacherQ2 = teachers.find((t) => t.id === subject.quarter.q2);
      teacherData.q2 = teacherQ2 ? teacherQ2 : null;
    }

    if (subject?.quarter.q3) {
      const teacherQ3 = teachers.find((t) => t.id === subject.quarter.q3);
      teacherData.q3 = teacherQ3 ? teacherQ3 : null;
    }

    setasignedTeacher(teacherData);
  }, [subject]);

  useEffect(() => {
    if (!teachers || !subject) return;

    // filtra los profesores activos
    const activeTeachers = teachers.filter((teacher) => teacher.active);

    let filteredTeachers = activeTeachers.map((teacher) => {
      const hours = getTeacherHoursData(teacher);
      const normalizedPerfilEntries = buildTeacherPerfilEntries(teacher);
      return {
        label: `${teacher.lastName} ${teacher.name}`.toUpperCase(),
        value: teacher.id,
        teacher: teacher,
        hours: hours,
        active: teacher.active,
        normalizedPerfilEntries,
      };
    });

    // filtra los profesores sin contrato
    filteredTeachers = filteredTeachers.filter((teacher) => {
      return teacher.teacher.contractTypeId !== null;
    });

    if (perfilOption === "perfil") {
      filteredTeachers = filteredTeachers.filter((teacher) => {
        if (!subject) return false;
        const perfilEntries =
          teacher.normalizedPerfilEntries.length > 0
            ? teacher.normalizedPerfilEntries
            : buildTeacherPerfilEntries(teacher.teacher);
        return teacherCanTeachSubject(perfilEntries, subject.id, subject.subject);
      });
    }

    setOptions(filteredTeachers);
  }, [teachers, subject, perfilOption]);

  const handleCancel = () => {
    setSelectedSubject(null);
  };

  const handleChange = (value: string) => {
    const selectedTeacher = teachers?.find((t) => t.id === value) || null;
    setSelectedOption(selectedTeacher);
  };

  const handleOk = () => {
    if (!subject || !selectedOption) return;
    const subjectId = subject?.innerId;
    const teacherId = selectedOption?.id;
    const addSubjectResponse = addSubjectToTeacher({ subjectId, teacherId });

    if (addSubjectResponse.error) {
      setLocalError(addSubjectResponse.message);
      return;
    }

    if (addSubjectResponse.data) {
      handleSubjectChange(addSubjectResponse.data);
    }

    setSelectedSubject(null);
  };

  const handleCleanAsignation = () => {
    if (!subject || (!asignedTeacher.q1 && !asignedTeacher.q2 && !asignedTeacher.q3)) return;
    const subjectId = subject?.innerId;
    const teacherIdQ1 = asignedTeacher.q1?.id || null;
    const res1 = removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ1 });
    if (res1.error) {
      setLocalError(res1.message);
      return;
    }

    const teacherIdQ2 = asignedTeacher.q2?.id || null;
    const res2 = removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ2 });
    if (res2.error) {
      setLocalError(res2.message);
      return;
    }

    const teacherIdQ3 = asignedTeacher.q3?.id || null;
    const res3 = removeSubjectFromTeacher({ subjectId, teacherId: teacherIdQ3 });
    if (res3.error) {
      setLocalError(res3.message);
      return;
    }

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
        {localError && (
          <Alert
            message="No se pudo procesar la asignación"
            description={localError}
            type="error"
            showIcon
            closable
            onClose={() => setLocalError(null)}
            style={{ marginBottom: "15px" }}
          />
        )}
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
                  <div style={{ width: "80px", height: "80px", overflow: "hidden", position: "relative" }}>
                    <Photo teacher={teacher} />
                  </div>
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

