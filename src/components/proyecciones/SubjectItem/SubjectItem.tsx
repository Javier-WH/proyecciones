import { Subject } from "../../../interfaces/subject";
import { Tag } from 'antd';
import { ExclamationCircleOutlined, } from '@ant-design/icons';
import "./SubjectItem.css"
import { IoMdSwap } from "react-icons/io";
import { useContext } from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

export default function SubjectItem({ subjects, title, gridArea }: { subjects: Array<Subject> | null, title: string, gridArea: string }) {

  const { setSelectedSubject, setOpenChangeSubjectFromTeacherModal} = useContext(MainContext) as MainContextValues

  const handleClick = (id:string) => {
    if(subjects === null) return
    const selected = subjects.find(subject => subject.id === id);
    setSelectedSubject(selected!);
    setOpenChangeSubjectFromTeacherModal(true);
  }

  return (
    <div className="footer-subject-item-container" style={{ gridArea: gridArea }}>
      <h1>{`${title} (${subjects?.length || 0})`}</h1>
      <div className="footer-subject-item-body">
        {
          !subjects || subjects.length === 0
            ? <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay ${title}`}</Tag>
            : subjects.map((subject, i) =>
              <div key={i} className="footer-subject-item">
                <span>{`${subject.subject} (PNF ${subject.pnf}, ${subject.hours} horas)`}</span>
                <IoMdSwap onClick={() => handleClick(subject.id)} style={{ fontSize: "20px" }}/>
              </div>
            )
        }
      </div>
    </div>
  )

}