import { Modal, InputNumber, Checkbox, message } from 'antd';
import { TableSubject } from '../../../../interfaces/subject';
import { useEffect, useState } from 'react';
import postPensum from '../../../../fetch/postPensum';


export default function EditPensumSubjectModal(
  { subject, setSubject, fetchPensum }: { subject: TableSubject | null, setSubject: (subject: TableSubject | null) => void, fetchPensum: () => void }) {

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [q1, setQ1] = useState<boolean>(false);
  const [q2, setQ2] = useState<boolean>(false);
  const [q3, setQ3] = useState<boolean>(false);
  const [hours, setHours] = useState<number | null>(null);

  useEffect(() => {
    if (subject) {
      setHours(Number(subject.hours));
      if(subject?.quarter?.includes("1")) setQ1(true);
      if(subject?.quarter?.includes("2")) setQ2(true);
      if(subject?.quarter?.includes("3")) setQ3(true);
      setIsModalOpen(true);
    } else {
      setHours(null);
      setQ1(false);
      setQ2(false);
      setQ3(false);
      setIsModalOpen(false);
    }
  }, [subject]);

  const handleOk = async () => {
    if(!hours || (!q1 && !q2 && !q3)) return;

    const quarter = [];
    if(q1) quarter.push(1);
    if(q2) quarter.push(2);
    if(q3) quarter.push(3);

    const requesData = {
      id: subject?.key || undefined,
      hours: String(hours),
      quarter: await JSON.stringify(quarter),
      subject_id: undefined,
      trayecto_id: undefined,
      pnf_id: undefined,
      
    };

   const response = await postPensum(requesData);

    if (response.error) { 
      message.error(response.error);
      return;
    }

    await fetchPensum();
    setSubject(null);
    message.success(response.message);
  
  };

  const handleCancel = () => {
    setSubject(null);
  };



  return (
    <>
      <Modal title={subject?.subject} open={isModalOpen} onOk={handleOk} onCancel={handleCancel} okButtonProps={{ disabled: !hours || (!q1 && !q2 && !q3) }}>
        <span style={{ fontSize: "10px", color: "gray" }}>{`id: ${subject?.key}`}</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{color: "gray"}}>Horas a la semana</label>
            <InputNumber value={hours} onChange={(value) => setHours(value)} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", borderLeft:"1px solid gray", paddingLeft: "20px" }}>
            <label style={{ color: "gray" }}>Trimestres</label>
            <Checkbox onChange={(e) => setQ1(e.target.checked)} checked={q1}>Trimestre 1</Checkbox>
            <Checkbox onChange={(e) => setQ2(e.target.checked)} checked={q2}>Trimestre 2</Checkbox>
            <Checkbox onChange={(e) => setQ3(e.target.checked)} checked={q3}>Trimestre 3</Checkbox>
          </div>
        </div>
      </Modal>
    </>
  );
}

