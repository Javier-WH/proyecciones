import React, { useEffect, useState } from 'react';
import { Button, Modal, Flex, Select, Radio, Tag, Switch } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { Teacher } from '../../interfaces/teacher';
import { Subject } from '../../interfaces/subject';
import { CloseCircleOutlined } from '@ant-design/icons';
import './changeSubjectFromTeacherModal.css'
const ChangeSubjectFromTeacherModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  teachers: Array<Teacher> | null
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>
  selectedTeacerId: string | null
  subjects: Array<Subject> | null
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  selectedSubject: Subject | null
}> = ({ open, setOpen, teachers, selectedTeacerId, subjects, setSubjects, setTeachers, selectedSubject }) => {


  const [viableTeachersList, setViableTeachersList] = useState<Array<Teacher>>([]);
  const [teacherID, setTeacherID] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSubject === null || teachers === null) return;
    const subjectId = selectedSubject.id

    let viableTeachers = teachers.filter((teacher) => {
      return teacher.perfil?.some((subject) => subject === subjectId)
    })

    //si hay un id de docente seleccionado, se filtra la lista de docentes viables
    if (selectedTeacerId !== null) {
      viableTeachers = viableTeachers.filter((teacher) => teacher.id !== selectedTeacerId)
    }

    setViableTeachersList(viableTeachers)
  }, [selectedSubject, teachers, selectedTeacerId])

  const handleOk = () => {
    console.log(teacherID)
  };

  const handleCancel = () => {
    setOpen(false);
  };


  return (
    <>
      <Modal
        open={open}
        title={`${selectedSubject?.subject} (${selectedSubject?.pnf} T0-${selectedSubject?.seccion})`}
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
          <Radio.Group buttonStyle="solid" style={{ display: 'flex', flexDirection: 'column' }} onChange={(e: RadioChangeEvent) => setTeacherID(e.target.value)}>
            {
              viableTeachersList?.map((teacher, i) => {
                return <Radio.Button value={teacher.id} key={i}>{`${teacher.title} ${teacher.name} ${teacher.lastName} C.I.${teacher.ci}`}</Radio.Button>
              })
            }
          </Radio.Group>
        </div>

     

      </Modal>
    </>
  );
};

export default ChangeSubjectFromTeacherModal;