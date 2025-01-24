import { useEffect, useState } from "react"
import getSubjects from "../../fetch/getSubjects"
import { SimpleSubject } from "../../interfaces/subject"
import { MdEditSquare, MdDelete, MdOutlineSettingsBackupRestore } from "react-icons/md";
import { Button, Input, message, Radio } from "antd"
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import postSubjects from "../../fetch/postSubjects";
import EditTeacherModal from "./editSubjectModal";
import "./editSubjects.css"

export default function EditSubjects() {

  const [subjectList, setSubjectList] = useState<SimpleSubject[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [subjectName, setSubjectName] = useState<string>("")
  const [showActiveSubjects, setShowActiveSubjects] = useState<number>(1)
  const [SimpleSubject, setSimpleSubject] = useState<SimpleSubject | null>(null)

  const fetchSubjects = async () => {
    const subjects: SimpleSubject[] = await getSubjects()
    setSubjectList(subjects)
  }

  const handleEditSubject = (subject: SimpleSubject) => {
    setSimpleSubject(subject)
  }

  const handleDeleteSubject = async ({ subject, active }: { subject: SimpleSubject, active: 1 | 0 }) => {
    const response = await postSubjects({ id: subject.id, name: undefined, active })
    if (response.error) {
      message.error(response.error)
      return
    }
    await fetchSubjects()
    message.success(response.message)
  }

  const handleCreateSubject = async () => {
    if (subjectName.length === 0) {
      message.warning("Por favor, ingrese un nombre para la materia")
      return
    }
    const response = await postSubjects({ id: undefined, name: subjectName, active: 1 })
    if (response.error) {
      message.error(response.error)
      return
    }
    await fetchSubjects()
    message.success(response.message)
  }

  const filteredSubjectList = (): SimpleSubject[] => {
    if (searchTerm.length > 0) {
      return subjectList.filter(subject => subject.name.toLowerCase().includes(searchTerm.toLowerCase()) && subject.active === showActiveSubjects)
    }
    return subjectList.filter(subject => subject.active === showActiveSubjects)
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const options: CheckboxGroupProps<string>['options'] = [
    { label: 'Activas', value: '1' },
    { label: 'Inactivas', value: '0' },
  ];

  return (
    <div>
      <EditTeacherModal subject={SimpleSubject} setSubject={setSimpleSubject} fetchSubjects={fetchSubjects} />
      <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem" }}>
        <h1>Materias</h1>
      </div>

      <div className="edit-subject-container">

        <div>
          <h3>Crear materia</h3>
          <Input placeholder="Nombre de la materia" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "10px", maxWidth: "200px", marginTop: "10px" }}>
            <Button type="dashed" >Limpiar</Button>
            <Button type="primary" onClick={handleCreateSubject} >Crear</Button>
          </div>
        </div>

        <div className="edit-subject-container-search">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <span>Materias creadas</span>
            <Radio.Group
              options={options}
              defaultValue="1"
              optionType="button"
              buttonStyle="solid"
              onChange={(e) => setShowActiveSubjects(Number(e.target.value))}
            />
          </div>
          <Input placeholder="Buscar materia" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="edit-subject-item-container">
          {
            filteredSubjectList().length === 0 
            ? <div>{`No se encontraron materias ${showActiveSubjects === 1 ? "activas" : "inactivas"}`}</div> 
            :filteredSubjectList().map(subject => (
              <div key={subject.id} className="edit-subject-item-row" >
                <span>{subject.name}</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: ".1px", width: "100px" }}>
                  {
                    subject.active === 1
                      ? <>
                        <Button type="primary" shape="circle" icon={<MdEditSquare />} onClick={() => handleEditSubject(subject)} />
                        <Button type="primary" shape="circle" danger icon={<MdDelete />} onClick={() => handleDeleteSubject({ subject, active: 0 })} />
                      </>
                      : <Button type="primary" shape="circle" icon={<MdOutlineSettingsBackupRestore />} onClick={() => handleDeleteSubject({ subject, active: 1 })} />
                  }
                </div>
              </div>
            ))
          }
        </div>

      </div>
    </div>
  )
}