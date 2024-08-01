import { Subject } from "../../../interfaces/subject";
import { Tag } from 'antd';
import { ExclamationCircleOutlined, } from '@ant-design/icons';
import "./SubjectItem.css"
import { IoMdSwap } from "react-icons/io";

export default function SubjectItem({ subjects, title, gridArea }: { subjects: Array<Subject> | null, title: string, gridArea: string }) {

  const handleClick = (e:string) => {
    console.log(e);
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