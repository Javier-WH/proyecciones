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

  const { setOpenAddSubjectToTeacherModal } = useContext(MainContext) as MainContextValues;



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
                  <Button type="link" shape='round' style={{ color: "white", fontSize: "18px" }}>
                    <IoMdSwap />
                  </Button>
                  <Button type="link" shape='round' danger>
                    <FaTrashAlt />
                  </Button>
                </div>
              </h4>
              <div style={{ marginLeft: "20px", marginTop: "3px", display: "flex", gap: "1px", justifyContent: "start", flexWrap: "wrap" }}>
                <Tag color="default" >{`PNF:${subject.pnf}`}</Tag>
                <Tag color="default">{`Seccion: T-0${subject.seccion}`}</Tag>
                <Tag color="default">{`Horas: ${subject.hours}`}</Tag>
              </div>
            </div>
          ))
      }

    </div>

  </div>
};

export default Subjects;