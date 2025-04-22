import React, { useEffect, useState, useContext, Dispatch, SetStateAction } from "react";
import { Button, Modal, Select, Radio, Tag, Switch } from "antd";
//import type { RadioChangeEvent } from "antd";
import { Subject } from "../../../interfaces/subject";
import useSetSubject, { useSubjectResponseTeacherHours } from "../../../hooks/useSetSubject";

import { Teacher } from "../../../interfaces/teacher";
//import SubjectTeacherInfo from "../../addSubjectToTeacherModal/subjectTeacherInfo";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

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

const AddSubjectToTeacherModal: React.FC<AddSubjectToTeacherModalParams> = ({
  subject,
  setSelectedSubject,
}) => {
  const { subjectColors, teachers, subjects } = useContext(MainContext) as MainContextValues;
  const { getTeacherHoursData } = useSetSubject(subjects || []);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options[]>([]);
  const [selectedOption, setSelectedOption] = useState<Teacher | null>(null);

  useEffect(() => {
    if (!subject) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [subject]);

  useEffect(() => {
    if (!teachers) return;
    let filteredTeachers = teachers.q1.map((teacher) => {
      const hours = getTeacherHoursData(teacher);
      return {
        label: `${teacher.lastName} ${teacher.name}`.toUpperCase(),
        value: teacher.id,
        teacher: teacher,
        hours: hours,
      };
    });

    filteredTeachers = filteredTeachers.filter((teacher) => {
      console.log(teacher.teacher);
      return teacher.teacher.contractTypeId !== null;
    });

    setOptions(filteredTeachers);
  }, [teachers, subject]);

  const handleCancel = () => {
    setSelectedSubject(null);
  };

  const handleChange = (value: string) => {
    const selectedTeacher = teachers?.q1.find((t) => t.id === value) || null;
    setSelectedOption(selectedTeacher);
  };

  const handleOk = () => {};

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
            <Tag>{`Sección: ${subject?.turnoName[0]}-${subject?.seccion}`}</Tag>
            <Tag>{`Horas: ${subject?.hours.q1} / ${subject?.hours.q2} / ${subject?.hours.q3}`}</Tag>
          </div>

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
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
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
        </div>
      </Modal>
    </>
  );
};

export default AddSubjectToTeacherModal;

