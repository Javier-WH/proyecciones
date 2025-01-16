import { MainContext } from "../../../context/mainContext"
import { MainContextValues } from "../../../interfaces/contextInterfaces"
import { Button } from 'antd';
import { LiaUserEditSolid } from "react-icons/lia";
import { Teacher } from "../../../interfaces/teacher";
import { useContext } from "react"

export default function EditTeachers() {

  const { teachers } = useContext(MainContext) as MainContextValues

  if(teachers === null) return <div>Loading...</div>

  const onClickEdit = (teacherData: Teacher) => {
    console.log(teacherData)
  }

  return <div>
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px"}}>
      <span>Apellidos</span>
      <span>Nombres</span>
      <span>Cédula</span>
      <span>Editar</span>
      {
         teachers.q1.map(teacher => {
            return <>
              <span>{teacher.lastName}</span>
              <span>{teacher.name}</span>
              <span>{teacher.ci}</span>
              <Button type="primary" shape="circle" icon={<LiaUserEditSolid />} onClick={()=>onClickEdit(teacher)}/>
            </>
          })

      }
    </div>

  </div>

}