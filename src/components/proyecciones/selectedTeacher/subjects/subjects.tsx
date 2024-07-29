import React from 'react';
import type { CollapseProps } from 'antd';
import { Collapse } from 'antd';
import { Subject } from '../../../../interfaces/subject';
import { Button } from 'antd';
import { FaTrashAlt } from "react-icons/fa";
import { MdAssignmentAdd } from "react-icons/md";
import "./subjects.css"


const Subjects: React.FC<{ data: Subject[] | null }> = ({ data }) => {

  if (!data || data.length === 0) {
    return <div>
      <p>No hay asignaturas</p>
    </div>;
  }


  const items: CollapseProps['items'] = data.map((subject, i) => ({
    key: i,
    label: subject.subject,
    children: <div style={{ position: "relative" }}>
      <Button type="text" shape='round' danger style={{ position: "absolute", right: -20, top: -40 }}>
        <FaTrashAlt />
      </Button>
      <ul style={{ marginLeft: "10%" }}>
        <li>{`${subject.pnf} T-0${subject.seccion}`}</li>
        <li>{`horas: ${subject.hours}`}</li>
      </ul>
    </div>
  }));

  const onChange = (key: string | string[]) => {
    //console.log(key);
  };

  return <div className='teacher-subjects-container'>
    <div  style={{ display: "flex", alignItems: "center", gap: "30px" }}>
      <h2>Asignaturas Asignadas</h2>
      <Button type="link" shape="round" size='large' style={{ fontSize: "14px" }}> <MdAssignmentAdd />Agregar</Button>
    </div>
    <Collapse
      bordered={false}
      size='small'
      items={items}
      defaultActiveKey={['0']}
      onChange={onChange} />
  </div>
};

export default Subjects;