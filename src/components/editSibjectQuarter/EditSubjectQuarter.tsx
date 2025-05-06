import React, { useEffect, useState } from "react";
import { Button, Modal, Tag, Select } from "antd";
import { Subject } from "../../interfaces/subject";
import { Teacher } from "../../interfaces/teacher";
import { normalizeText } from "../../utils/textFilter";

interface TeacherOption {
  value: string;
  label: string;
  teacherId: string;
  teacherName: string;
  teacherLastName: string;
  teacherCi: string;
}

const EditSubjectQuarterModal: React.FC<{
  subject: Subject | null;
  setSubject: React.Dispatch<React.SetStateAction<Subject | null>>;
  teachers: Teacher[];
  subjectColors: Record<string, string> | null;
  subjects: Subject[];
  handleSubjectChange: (data: Subject[]) => void;
}> = ({ subject, setSubject, teachers, subjectColors, handleSubjectChange, subjects }) => {
  const [open, setOpen] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [selectedTeacherQ1, setSelectedTeacherQ1] = useState<Teacher | null | undefined>(null);
  const [selectedTeacherQ2, setSelectedTeacherQ2] = useState<Teacher | null | undefined>(null);
  const [selectedTeacherQ3, setSelectedTeacherQ3] = useState<Teacher | null | undefined>(null);

  useEffect(() => {
    if (!subject) {
      setOpen(false);
      return;
    }
    const quarters = Object.keys(subject.quarter);
    if (quarters.includes("q1")) {
      setSelectedTeacherQ1(teachers.find((teacher) => teacher.id === subject.quarter.q1) || null);
    } else {
      setSelectedTeacherQ1(undefined);
    }

    if (quarters.includes("q2")) {
      setSelectedTeacherQ2(teachers.find((teacher) => teacher.id === subject.quarter.q2) || null);
    } else {
      setSelectedTeacherQ2(undefined);
    }

    if (quarters.includes("q3")) {
      setSelectedTeacherQ3(teachers.find((teacher) => teacher.id === subject.quarter.q3) || null);
    } else {
      setSelectedTeacherQ3(undefined);
    }

    setOpen(true);
  }, [subject]);

  useEffect(() => {
    if (!teachers) return;
    const options = teachers.map((teacher) => ({
      value: teacher.ci,
      label: `${teacher.name} ${teacher.lastName} C.I. ${teacher.ci}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherLastName: teacher.lastName,
      teacherCi: teacher.ci,
    }));
    setTeacherOptions(options);
  }, [teachers]);

  const handleOk = () => {
    if (!subject || !subjects) return;

    const subjectCopy = [...subjects];
    const subjectIndex = subjectCopy.findIndex((subj) => subj.innerId === subject.innerId);
    if (subjectIndex === -1) return;
    if (selectedTeacherQ1 !== undefined) {
      subjectCopy[subjectIndex].quarter.q1 = selectedTeacherQ1?.id;
    }
    if (selectedTeacherQ2 !== undefined) {
      subjectCopy[subjectIndex].quarter.q2 = selectedTeacherQ2?.id;
    }
    if (selectedTeacherQ3 !== undefined) {
      subjectCopy[subjectIndex].quarter.q3 = selectedTeacherQ3?.id;
    }
    handleSubjectChange(subjectCopy);
    handleCancel();
  };

  const handleCancel = () => {
    setSubject(null);
  };

  const handleSelectTeacher = ({ teacherCi, quarter }: { teacherCi: string; quarter: 1 | 2 | 3 }) => {
    if (!teacherCi || !quarter) return;
    if (quarter === 1) {
      setSelectedTeacherQ1(teachers.find((teacher) => teacher.ci === teacherCi) || null);
    }
    if (quarter === 2) {
      setSelectedTeacherQ2(teachers.find((teacher) => teacher.ci === teacherCi) || null);
    }
    if (quarter === 3) {
      setSelectedTeacherQ3(teachers.find((teacher) => teacher.ci === teacherCi) || null);
    }
  };

  return (
    <>
      <Modal
        width={1000}
        style={{
          maxWidth: "700px",
          minWidth: "500px",
          width: "100vw",
        }}
        open={open}
        title={subject?.subject}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type="dashed">
            Cancelar
          </Button>,
          <Button key="submit" type="primary" onClick={handleOk} disabled={false}>
            Aceptar
          </Button>,
        ]}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: subject?.pnfId ? subjectColors?.[subject.pnfId] : "transparent",
            height: "40px",
            paddingLeft: "20px",
            borderRadius: "5px",
          }}>
          <div>
            <Tag style={{ marginRight: "10px" }}>{subject?.pnf}</Tag>
            <Tag style={{ marginRight: "10px" }}>{subject?.trayectoName}</Tag>
            <Tag style={{ marginRight: "10px" }}>
              {`Sección: ${subject?.turnoName[0]}-${subject?.seccion}`}
            </Tag>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            marginTop: "20px",
            gap: "20px",
            alignItems: "center",
            marginBottom: "20px",
          }}>
          {Object.keys(subject?.quarter || {}).includes("q1") && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "gray" }}>Trimestre I</label>
              <Select
                size="large"
                showSearch
                style={{ width: 600 }}
                placeholder="Seleccione un profesor para el trimestre I"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  //(optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
                  normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
                }
                options={teacherOptions}
                value={selectedTeacherQ1?.ci}
                onChange={(value) => handleSelectTeacher({ teacherCi: value, quarter: 1 })}
                optionRender={(option) => {
                  const teacherOption = option.data;
                  return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{`${teacherOption.teacherLastName} ${teacherOption.teacherName}`}</span>
                      <span>{`C.I. ${teacherOption.teacherCi}`}</span>
                    </div>
                  );
                }}
              />
            </div>
          )}
          {Object.keys(subject?.quarter || {}).includes("q2") && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "gray" }}>Trimestre II</label>
              <Select
                size="large"
                showSearch
                style={{ width: 600 }}
                placeholder="Seleccione un profesor para el trimestre II"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  //(optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
                  normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
                }
                options={teacherOptions}
                value={selectedTeacherQ2?.ci}
                onChange={(value) => handleSelectTeacher({ teacherCi: value, quarter: 2 })}
                optionRender={(option) => {
                  const teacherOption = option.data;
                  return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{`${teacherOption.teacherLastName} ${teacherOption.teacherName}`}</span>
                      <span>{`C.I. ${teacherOption.teacherCi}`}</span>
                    </div>
                  );
                }}
              />
            </div>
          )}
          {Object.keys(subject?.quarter || {}).includes("q3") && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "gray" }}>Trimestre III</label>
              <Select
                size="large"
                showSearch
                style={{ width: 600 }}
                placeholder="Seleccione un profesor para el trimestre III"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  //(optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
                  normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
                }
                options={teacherOptions}
                value={selectedTeacherQ3?.ci}
                onChange={(value) => handleSelectTeacher({ teacherCi: value, quarter: 3 })}
                optionRender={(option) => {
                  const teacherOption = option.data;
                  return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{`${teacherOption.teacherLastName} ${teacherOption.teacherName}`}</span>
                      <span>{`C.I. ${teacherOption.teacherCi}`}</span>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default EditSubjectQuarterModal;

