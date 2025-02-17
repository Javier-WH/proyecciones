import { Subject } from "../../../interfaces/subject";
import { Table, Tag, Input } from 'antd';
import type { TableProps } from 'antd';
import { ExclamationCircleOutlined, } from '@ant-design/icons';
import { IoMdSwap } from "react-icons/io";
import { useContext, useEffect, useState} from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import "./SubjectItem.css"
import { Teacher } from "../../../interfaces/teacher";


export default function SubjectItemAsigned({ subjects, title }: { subjects: Array<Subject> | null, title: string }) {

  const { setSelectedSubject, setOpenChangeSubjectFromTeacherModal, teachers, setSelectedTeacerId } = useContext(MainContext) as MainContextValues
  const [data, setData] = useState<Subject[]>([]);
  const [filteredText, setFilteredText] = useState<string>("");



  const handleClick = (subject: Subject) => {
    if (subjects === null) return

    const selected = subjects.filter((selected) => {
      if (selected.pensum_id === subject.pensum_id &&
        selected.seccion === subject.seccion &&
        selected.trayectoName === subject.trayectoName &&
        selected.turnoName === subject.turnoName) return selected

    })[0]

    let teacher: Teacher | undefined = undefined

    if(selected.quarter.includes(1)){
      teacher = teachers?.q1.filter((teacher: Teacher) => {
        const load = teacher.load
        if (load?.some((subject) => (
          subject.pensum_id === selected.pensum_id &&
          subject.seccion === selected.seccion &&
          subject.trayectoName === selected.trayectoName &&    
          subject.turnoName === selected.turnoName  
        ))){
          return teacher
        } 
      })[0] ;
    }

    if (selected.quarter.includes(2)) {
      teacher = teachers?.q2.filter((teacher: Teacher) => {
        const load = teacher.load
        if (load?.some((subject) => (
          subject.pensum_id === selected.pensum_id &&
          subject.seccion === selected.seccion &&
          subject.trayectoName === selected.trayectoName &&
          subject.turnoName === selected.turnoName
        ))) {
          return teacher
        }
      })[0];
    }

    if (selected.quarter.includes(3)) {
      teacher = teachers?.q3.filter((teacher: Teacher) => {
        const load = teacher.load
        if (load?.some((subject) => (
          subject.pensum_id === selected.pensum_id &&
          subject.seccion === selected.seccion &&
          subject.trayectoName === selected.trayectoName &&
          subject.turnoName === selected.turnoName
        ))) {
          return teacher
        }
      })[0];
    }
    setSelectedTeacerId(teacher?.id ?? null);
    setSelectedSubject(selected);
    setOpenChangeSubjectFromTeacherModal(true);

  }



  const columns: TableProps<Subject>['columns'] = [
    {
      title: 'Materia',
      dataIndex: 'subject',
      key: 'subject',
      render: (text) => <a>{text}</a>,
    },
    {
      title: 'Profesor',
      dataIndex: 'teacherName',
      key: 'teacherName',
    },
    {
      title: 'C.I.',
      dataIndex: 'teacherCi',
      key: 'teacherCi',
    },
    {
      title: 'Action',
      key: 4,
      render: (_, record) => (
        <IoMdSwap onClick={() => handleClick(record)} style={{ fontSize: "20px" }} />
      ),
    },
  ];



  useEffect(() => {
    if (subjects === null) return
    const subjectsWithKey: Subject[] = subjects.map((subject: Subject, i) => {
      subject.key = i
      return subject
    })

    if (filteredText.length === 0) {
      setData(subjectsWithKey)
      return
    }
 
 
  
    setData(subjectsWithKey.filter(subject => {
      if (
        subject?.subject?.toLowerCase()?.includes(filteredText?.toLowerCase()) ||
        subject?.pnf?.toLowerCase()?.includes(filteredText?.toLowerCase()) ||
        subject?.teacherName?.toLowerCase()?.includes(filteredText?.toLowerCase()) ||
        subject?.teacherCi?.toLowerCase()?.includes(filteredText?.toLowerCase())
      ) {
        return true
      }
    }))
  }, [subjects, filteredText])

  if (!subjects || subjects.length === 0) {
    return <>
      <div className="footer-subject-item-container" >
        <h1>{`${title} (${subjects?.length || 0})`}</h1>
        <div className="footer-subject-item-body">
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay ${title}`}</Tag>
        </div>
      </div>
    </>
  }

  return (
    <div className="footer-subject-item-container" >
      <h1>{`${title} (${subjects?.length || 0})`}</h1>
      <Input value={filteredText} onChange={(e) => setFilteredText(e.target.value)} placeholder="Filtrar por materia" allowClear />
      <div className="footer-subject-item-body">
        <Table<Subject> 
          columns={columns} 
          dataSource={data} 
          pagination={{ position: ["topLeft", "none"] }} 
          expandable={{
            expandedRowRender: (record) => 
            <div style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "space-evenly", gap: "5px" }}>
              <Tag color="blue">{`${record?.pnf}`}</Tag>
              <Tag color="orange">{`Sección: ${record?.turnoName[0]}-0${record?.seccion}`}</Tag>
              <Tag color="green">{`Trayecto: ${record?.trayectoName}`}</Tag>
              </div>
            ,
          }} 
          />
      </div>
    </div>
  )

}