import { Button, Modal, Tag, InputNumber, Input } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { Subject } from "../../../interfaces/subject";

import { useEffect, useContext, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { InlineHours, InlineQuarter } from "../../../interfaces/subject";

const EditProyeccionesSubjectModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  subject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void;
}> = ({ open, setOpen, subject, setSelectedSubject }) => {
  const { handleSubjectChange, subjects } = useContext(MainContext) as MainContextValues;

  const [pnfValue, setPnfValue] = useState<string | null>(null);
  const [_subjects, _setSubjects] = useState<Array<{ value: string; label: string }> | null>(null);
  const [subjectValue, setSubjectValue] = useState<string>("");
  const [trimestreValue, setTrimestreValue] = useState<InlineQuarter | null>(null);
  const [hourValue, setHourValue] = useState<InlineHours | null>(null);
  const [seccionValue, setSeccionValue] = useState<string>("4");

  useEffect(() => {
    if (subject === null) {
      setOpen(false);
    }
    setPnfValue(subject?.pnf || null);
    setSubjectValue(subject?.subject || "");
    setHourValue(subject?.hours || null);
    setTrimestreValue(subject?.quarter || null);
    setSeccionValue(subject?.seccion || "1");
  }, [subject, setOpen]);

  const handleOk = () => {
    if (
      subject === null ||
      hourValue === null ||
      pnfValue === null ||
      subjectValue === null ||
      !trimestreValue
    )
      return;

    //edita el array de materias
    const _subjects = JSON.parse(JSON.stringify(subjects));
    const updatedSubjects = _subjects.map((sub: Subject) => {
      if (sub.innerId === subject.innerId) {
        sub.hours = hourValue;
        sub.pnf = pnfValue;
        sub.subject = subjectValue;
        sub.quarter = trimestreValue;
        sub.seccion = seccionValue;
      }
      return sub;
    });
    handleSubjectChange(updatedSubjects);
    setOpen(false);
  };

  const handleUpdateSimilar = () => {
    if (
      subject === null ||
      hourValue === null ||
      pnfValue === null ||
      subjectValue === null ||
      !trimestreValue
    )
      return;

    //edita el array de materias
    const _subjects = JSON.parse(JSON.stringify(subjects));
    const updatedSubjects = _subjects.map((sub: Subject) => {
      if (sub.pensum_id === subject.pensum_id) {
        // esto es para conservar los valores de los profesores que ya han sido asignados a la materia
        const newQuarters = mergeQuarters(
          trimestreValue as { [key: string]: string | null },
          sub.quarter as { [key: string]: string | null }
        );
        sub.hours = hourValue;
        sub.pnf = pnfValue;
        sub.subject = subjectValue;
        sub.quarter = newQuarters;
        //sub.seccion = seccionValue;
      }
      return sub;
    });
    handleSubjectChange(updatedSubjects);
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedSubject(null);
    setOpen(false);
  };

  const handleTrimestreChange = (index: "q1" | "q2" | "q3") => {
    const hourValueCopy = { ...hourValue };
    const trimestreValueCopy = { ...trimestreValue };

    if (hourValueCopy[index]) {
      delete hourValueCopy[index];
      delete trimestreValueCopy[index];
    } else {
      hourValueCopy[index] = 1;
      trimestreValueCopy[index] = null;
    }
    setHourValue(hourValueCopy);
    setTrimestreValue(trimestreValueCopy);
  };

  const handleHoursChange = (e: number | null, index: "q1" | "q2" | "q3") => {
    if (!e || !hourValue) return;

    const hourValueCopy = { ...hourValue };
    if (!hourValueCopy[index]) return;
    hourValueCopy[index] = e;
    setHourValue(hourValueCopy);
  };

  return (
    <>
      <Modal
        open={open}
        title={"Editar materia"}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type="dashed">
            Cancelar
          </Button>,
          <Button key="update" onClick={handleUpdateSimilar} disabled={false}>
            Actualizar Similares
          </Button>,
          <Button key="submit" type="primary" onClick={handleOk} disabled={false}>
            Actualizar
          </Button>,
        ]}>
        <div
          className="change-proyecciones-subject-modal-container"
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            rowGap: "1rem",
            marginBottom: "2rem",
          }}>
          {<span style={{ color: "gray", fontSize: "0.7rem" }}>{subject?.pensum_id}</span>}

          <div>
            <label
              style={{
                color: !subjectValue ? "red" : "black",
              }}>
              Nombre de la materia
            </label>
            <Input value={subjectValue} onChange={(e) => setSubjectValue(e.target.value)} />
            {subjectValue.length === 0 && (
              <Tag icon={<CloseCircleOutlined />} color="error">{`No hay materia seleccionada`}</Tag>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", rowGap: "5px" }}>
            <span>Trimestre</span>
            <div
              style={{
                display: "flex",
                gap: "10px",
              }}>
              <Button
                type={hourValue?.q1 ? "primary" : "default"}
                shape="circle"
                onClick={() => handleTrimestreChange("q1")}>
                1
              </Button>

              {hourValue?.q1 && (
                <InputNumber
                  min={1}
                  max={24}
                  onChange={(e) => handleHoursChange(e, "q1")}
                  value={hourValue?.q1}
                />
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}>
              <Button
                type={hourValue?.q2 ? "primary" : "default"}
                shape="circle"
                onClick={() => handleTrimestreChange("q2")}>
                2
              </Button>

              {hourValue?.q2 && (
                <InputNumber
                  min={1}
                  max={24}
                  onChange={(e) => handleHoursChange(e, "q2")}
                  value={hourValue?.q2}
                />
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}>
              <Button
                type={hourValue?.q3 ? "primary" : "default"}
                shape="circle"
                onClick={() => handleTrimestreChange("q3")}>
                3
              </Button>

              {hourValue?.q3 && (
                <InputNumber
                  min={1}
                  max={24}
                  onChange={(e) => handleHoursChange(e, "q3")}
                  value={hourValue?.q3}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditProyeccionesSubjectModal;

function mergeQuarters(
  availableQuarters: { [key: string]: string | null },
  quarter: { [key: string]: string | null }
): { [key: string]: string | null } {
  const result: { [key: string]: string | null } = {};
  const availableKeys = Object.keys(availableQuarters);
  for (const key of availableKeys) {
    if (Object.prototype.hasOwnProperty.call(quarter, key)) {
      result[key] = quarter[key];
    } else {
      result[key] = null;
    }
  }
  return result;
}
