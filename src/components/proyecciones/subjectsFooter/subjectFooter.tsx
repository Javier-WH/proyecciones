import "./subjecFooter.css"
import { useContext } from "react"
import { MainContext } from "../../../context/mainContext" 
import { MainContextValues } from "../../../interfaces/contextInterfaces"
import { Tag } from 'antd';
import { ExclamationCircleOutlined, } from '@ant-design/icons';
export default function SubjectFooter() {

  const { subjects } = useContext(MainContext) as MainContextValues

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const targetId = (e.target as HTMLElement).id;
    console.log(targetId)
  }
  return (
    <div className="subject-footer" onClick={handleClick}>
        {
          !subjects || subjects.length === 0
            ? <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay asignaturas asignadas`}</Tag>
            : subjects.map((subject, i) => (
              <div key={i} >
                <span id={`subject-${subject.id}`}>
                  {`${subject.subject} (PNF ${subject.pnf}, ${subject.hours} horas)`}
                </span>
              </div>
            ))   
        }
    </div>
  )
}