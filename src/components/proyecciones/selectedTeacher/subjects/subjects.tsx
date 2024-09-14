import React, {useContext} from 'react';
import { Subject } from '../../../../interfaces/subject';
import { Button } from 'antd';
import { FaTrashAlt } from "react-icons/fa";
import { MdAssignmentAdd } from "react-icons/md";
import { IoMdSwap } from "react-icons/io";
import { Tag } from 'antd';
import { ExclamationCircleOutlined, } from '@ant-design/icons';
import { MainContext } from '../../../../context/mainContext';
import { MainContextValues } from '../../../../interfaces/contextInterfaces';


import "./subjects.css"


const Subjects: React.FC<{ data: Subject[] | null }> = ({ data }) => {

  const { setOpenAddSubjectToTeacherModal, teachers, selectedTeacerId, subjects, setOpenChangeSubjectFromTeacherModal, setSelectedSubject, selectedQuarter, handleSubjectChange, handleTeacherChange } = useContext(MainContext) as MainContextValues;

 
  const handleRemoveSubject = (e: React.MouseEvent<HTMLButtonElement>) => {
    const subjectId = e.currentTarget.id
    if (!subjectId || !teachers || selectedTeacerId === null || subjects === null) return
    
    const subData = subjectId.split(" ")
    const [_subjectId, _pensumId, _seccion] = subData;
    const targetKey = `${_subjectId}${_pensumId}${_seccion}`

    //copio el array para no modificar el original y hago el filtro para eliminar la materia
    const teachersCopy = JSON.parse(JSON.stringify(teachers));
    const teacherIndex = teachers[selectedQuarter].findIndex(teacher => teacher.id === selectedTeacerId)

    teachersCopy["q1"][teacherIndex].load = teachers["q1"][teacherIndex].load?.filter(subject => {
      const subjecKey = `${subject.id}${subject.pensum_id}${subject.seccion}`
      return subjecKey !== targetKey
    })


    teachersCopy["q2"][teacherIndex].load = teachers["q2"][teacherIndex].load?.filter(subject => {
      const subjecKey = `${subject.id}${subject.pensum_id}${subject.seccion}`
      return subjecKey !== targetKey
    })


    teachersCopy["q3"][teacherIndex].load = teachers["q3"][teacherIndex].load?.filter(subject => {
      const subjecKey = `${subject.id}${subject.pensum_id}${subject.seccion}`
      return subjecKey !== targetKey
    })
    

    //guardado la materia para reintegrarla a la lista de materias
    const savedSubject = teachers[selectedQuarter][teacherIndex].load?.find(subject => subject.id === _subjectId && subject.pensum_id === _pensumId && subject.seccion === _seccion)
 
    handleSubjectChange([...subjects, savedSubject!])
    handleTeacherChange(teachersCopy)
  }

  const handleSwapSubjects = () => {
    if(!data) return
    setSelectedSubject(data[0]);
    setOpenChangeSubjectFromTeacherModal(true)
  }


  return <div className='teacher-subjects-container'>
    <div className='teacher-subjects-header'>
      <h2>Asignaturas Asignadas</h2>
      <Button type="link" shape="round" size='large' style={{ fontSize: "14px" }} onClick={() => setOpenAddSubjectToTeacherModal(true)}> <MdAssignmentAdd />Agregar</Button>
    </div>

    <div className='teacher-subjects-body'>
      {
        !data || data.length === 0
          ? <Tag color="warning" icon={<ExclamationCircleOutlined />}>{`No hay asignaturas asignadas`}</Tag>
          : data.map((subject, i) => (
            <div key={i} style={{ marginBottom: "5px" }}>
              
              <h4>{subject.subject}
                <div className="teacher-subjects-buttons">
                  <Button type="link" shape='round' style={{ color: "white", fontSize: "18px" }} onClick={handleSwapSubjects}>
                    <IoMdSwap />
                  </Button>
                  <Button id={`${subject.id} ${subject.pensum_id} ${subject.seccion}`} type="link" shape='round' danger onClick={handleRemoveSubject}>
                    <FaTrashAlt />
                  </Button>
                </div>
              </h4>
              <div style={{ marginLeft: "20px", marginTop: "3px", display: "flex", gap: "1px", justifyContent: "start", flexWrap: "wrap" }}>
                <Tag color="default" >{subject.pnf}</Tag>
                <Tag color="default">{`Seccion: ${subject.seccion}`}</Tag>
                <Tag color="default">{subject.trayectoName}</Tag>
                <Tag color="default">{`Horas: ${subject.hours}`}</Tag>
              </div>
            </div>
          ))
      }

    </div>

  </div>
};

export default Subjects;