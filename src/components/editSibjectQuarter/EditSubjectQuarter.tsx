import React, { useEffect, useState } from "react";
import { Button, Modal, Tag } from "antd";

import { Subject } from "../../interfaces/subject";
import { Teacher } from "../../interfaces/teacher";

const EditSubjectQuarterModal: React.FC<{
  subject: Subject | null;
  setSubject: React.Dispatch<React.SetStateAction<Subject | null>>;
  teachers: Teacher[];
  subjectColors: Record<string, string> | null;
}> = ({ subject, setSubject, teachers, subjectColors }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (subject) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [subject]);

  const handleOk = () => {
    console.log("ok");
  };

  const handleCancel = () => {
    setSubject(null);
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
          }}>
          <div>
            <Tag style={{ marginRight: "10px" }}>{subject?.pnf}</Tag>
            <Tag style={{ marginRight: "10px" }}>{subject?.trayectoName}</Tag>
            <Tag style={{ marginRight: "10px" }}>
              {`Sección: ${subject?.turnoName[0]}-${subject?.seccion}`}
            </Tag>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditSubjectQuarterModal;

