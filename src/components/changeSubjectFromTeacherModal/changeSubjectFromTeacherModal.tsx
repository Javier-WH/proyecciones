import React, { useEffect, useState, useContext } from 'react';
import { Button, Modal, Radio } from 'antd';
import { Teacher, Quarter } from '../../interfaces/teacher';
import { Subject } from '../../interfaces/subject';
import { MainContext } from '../../context/mainContext';
import { MainContextValues } from '../../interfaces/contextInterfaces';

import './changeSubjectFromTeacherModal.css'
const ChangeSubjectFromTeacherModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  teachers: Quarter | null
  setTeachers: React.Dispatch<React.SetStateAction<Quarter | null>>
  selectedTeacerId: string | null
  subjects: Array<Subject> | null
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  selectedSubject: Subject | null
  selectedQuarter: "q1" | "q2" | "q3"
}> = ({ open, setOpen, teachers, selectedTeacerId, selectedSubject, selectedQuarter }) => {


  const { handleTeacherChange, subjects, handleSubjectChange} = useContext(MainContext) as MainContextValues
  const [viableTeachersList, setViableTeachersList] = useState<Array<Teacher>>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSubject === null || teachers === null) return;
    const subjectId = selectedSubject.id

    let viableTeachers = teachers[selectedQuarter].filter((teacher) => {
      return teacher.perfil?.some((subject) => subject === subjectId)
    })

    //si hay un id de docente seleccionado, se filtra la lista de docentes viables
    if (selectedTeacerId !== null) {
      viableTeachers = viableTeachers.filter((teacher) => teacher.id !== selectedTeacerId)
    }

    setViableTeachersList(viableTeachers)
  }, [selectedSubject, teachers, selectedTeacerId, selectedQuarter])

  const handleOk = () => {
    if (selectedOption === null || selectedSubject === null || teachers === null) return;

    const teachersCopy = JSON.parse(JSON.stringify(teachers));

    // se agrega la materia al docente
    if (selectedSubject.quarter.includes(1)) {
      const index = teachersCopy["q1"].findIndex((teacher: Teacher) => teacher.id === selectedOption);
      teachersCopy["q1"][index]?.load?.push(selectedSubject);
    }
    if (selectedSubject.quarter.includes(2)) {
      const index = teachersCopy["q1"].findIndex((teacher: Teacher) => teacher.id === selectedOption);
      teachersCopy["q2"][index]?.load?.push(selectedSubject);
    }
    if (selectedSubject.quarter.includes(3)) {
      const index = teachersCopy["q1"].findIndex((teacher: Teacher) => teacher.id === selectedOption);
      teachersCopy["q3"][index]?.load?.push(selectedSubject);
    }
    //const index = teachersCopy.q1.findIndex((teacher: Teacher) => teacher.id === selectedTeacerId)

    // se elimina la materia del docente
   if (selectedSubject.quarter.includes(1)) {
     const index = teachersCopy.q1.findIndex((teacher: Teacher) => teacher.id === selectedTeacerId)
    if (index !== -1) {
      teachersCopy["q1"][index].load = teachersCopy["q1"][index].load.filter(
        (subject: Subject ) =>
          subject.pensum_id !== selectedSubject.pensum_id ||
          subject.seccion !== selectedSubject.seccion ||
          subject.trayectoName !== selectedSubject.trayectoName ||
          subject.turnoName !== selectedSubject.turnoName
      );
    }
  }
  if (selectedSubject.quarter.includes(2)) {
    const index = teachersCopy.q1.findIndex((teacher: Teacher) => teacher.id === selectedTeacerId)
    if (index !== -1) {
      teachersCopy["q2"][index].load = teachersCopy["q2"][index].load.filter(
        (subject: Subject) =>
          subject.pensum_id !== selectedSubject.pensum_id ||
          subject.seccion !== selectedSubject.seccion ||
          subject.trayectoName !== selectedSubject.trayectoName ||
          subject.turnoName !== selectedSubject.turnoName
      );
    }
  }
  if (selectedSubject.quarter.includes(3)) {
    const index = teachersCopy.q1.findIndex((teacher: Teacher) => teacher.id === selectedTeacerId)
    if (index !== -1) {
      teachersCopy["q3"][index].load = teachersCopy["q3"][index].load.filter(
        (subject: Subject) =>
          subject.pensum_id !== selectedSubject.pensum_id ||
          subject.seccion !== selectedSubject.seccion ||
          subject.trayectoName !== selectedSubject.trayectoName ||
          subject.turnoName !== selectedSubject.turnoName
      );
    }
  }

    // se debe comrpobar que la materia no está en el array de materias
    const subjectsCopy = JSON.parse(JSON.stringify(subjects))
    const newSubjects = subjectsCopy?.filter((subject: Subject) => (subject.pensum_id !== selectedSubject.pensum_id ||
      subject.seccion !== selectedSubject.seccion ||
      subject.trayectoName !== selectedSubject.trayectoName ||
      subject.turnoName !== selectedSubject.turnoName
    ))

    handleSubjectChange(newSubjects)
    handleTeacherChange(teachersCopy)
    setOpen(false);


  };

  const handleCancel = () => {
    setOpen(false);
  };


  return (
    <>
      <Modal
        width={800}
        open={open}
        title={`${selectedSubject?.subject} (${selectedSubject?.pnf} ${selectedSubject?.trayectoName[0]}-${selectedSubject?.seccion})`}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type='dashed'>
            Cancelar
          </Button>,
          <Button key="submit" type="primary" onClick={handleOk} disabled={false}>
            Cambiar
          </Button>
        ]}
      >
        <div className='change-subject-modal-container-teacher-select'>
          <Radio.Group buttonStyle="solid" style={{ display: 'flex', flexDirection: 'column' }}>
            {
              viableTeachersList?.map((teacher, i) => {
                return <Radio.Button
                  value={teacher.id}
                  key={i}
                  onChange={(e) => setSelectedOption(e.target.value)}
                >
                  {`${teacher.title} ${teacher.name} ${teacher.lastName} C.I.${teacher.ci}`}
                </Radio.Button>
              })
            }
          </Radio.Group>
        </div>



      </Modal>
    </>
  );
};

export default ChangeSubjectFromTeacherModal;