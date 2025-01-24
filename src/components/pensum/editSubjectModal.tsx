import { Modal, Input, message } from "antd";
import { useEffect, useState } from "react";
import { SimpleSubject } from "../../interfaces/subject";
import postSubjects from "../../fetch/postSubjects";
export default function EditTeacherModal({
  subject,
  setSubject,
  fetchSubjects
}: {
    subject: SimpleSubject | null;
    setSubject: (SimpleSubject: SimpleSubject | null) => void;
    fetchSubjects: () => void;
}) {

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [subjectName, setSubjectName] = useState<string>("")

  useEffect(() => {
    if (subject) {
      setIsModalOpen(true)
      setSubjectName(subject.name)
    }else{
      setIsModalOpen(false)
      setSubjectName("")
    }
  }, [subject])

  const handleOk = async() => {
    if (subjectName.length === 0) {
      message.warning("Por favor, ingrese un nombre para la materia")
      return
    }
    const response = await postSubjects({ id: subject?.id, name: subjectName, active: undefined })
    if (response.error) {
      message.error(response.error)
      return
    }
    fetchSubjects()
    message.success("Materia editada correctamente")
    setIsModalOpen(false)
  }
  const handleCancel = () => {
    setSubject(null)
  }


  return (
    <Modal title="Editar Materia" open={isModalOpen} onOk={handleOk} onCancel={handleCancel} okText="Aceptar" cancelText="Cancelar">
      <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
    </Modal>
  );
}
