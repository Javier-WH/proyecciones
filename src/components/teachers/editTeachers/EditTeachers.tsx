import { MainContext } from "../../../context/mainContext"
import { MainContextValues } from "../../../interfaces/contextInterfaces"
import { Button } from 'antd';
import { LiaUserEditSolid } from "react-icons/lia";
import { Teacher } from "../../../interfaces/teacher";
import { useContext, useState } from "react"
import EditTeacherModal from "./EditTeacherModal";
import './editTeachers.css'

export default function EditTeachers() {

  const { teachers } = useContext(MainContext) as MainContextValues
  const [teacherData, setTeacherData] = useState<Teacher | null>(null)

  if (teachers === null) return <div>Loading...</div>

  const onClickEdit = (data: Teacher) => {
    setTeacherData(data)
  }

  return <div>
    <EditTeacherModal teacherData={teacherData} setTeacherData={setTeacherData} />
    <h2 className="edit-teacher-list-title">Editar Profesores</h2>
    <div className="edit-teacher-list-container">
      <div className="edit-teacher-list-header">

        <span>Apellidos</span>
        <span>Nombres</span>
        <span>Cédula</span>
        <span>Editar</span>
      </div>
      
      {
        teachers.q1.map(teacher => {
          return <div className="edit-teacher-list-row" key={teacher.id}>
            <span>{teacher.lastName}</span>
            <span>{teacher.name}</span>
            <span>{teacher.ci}</span>
            <Button type="primary" shape="circle" icon={<LiaUserEditSolid />} onClick={() => onClickEdit(teacher)} />
          </div>
        })

      }
    </div>

  </div>

}