import React, {  useContext} from 'react';
import type { TableColumnsType } from 'antd';
import { Table } from 'antd';
import { MainContext } from '../../../context/mainContext';
import { Teacher } from '../../../interfaces/teacher';



const TeacherTable: React.FC = () => {

  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }
  const { teachers, setSelectedTeacherById } = context;
  const data: Teacher[] | null = teachers;


  const columns: TableColumnsType<Teacher> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Apellido',
      dataIndex: 'lastName',
      key: 'lastName',
      width: '20%',
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Cédula',
      dataIndex: 'ci',
      key: 'ci',
      width: '10%',
      sorter: (a, b) => Number.parseInt(a.ci) - Number.parseInt(b.ci),
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Tipo de contrato',
      dataIndex: 'type',
      key: 'type',
      width: '10%',
      sorter: (a, b) => a.type.localeCompare(b.type),
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Horas Asignadas',
      dataIndex: 'partTime',
      render: (value, record) => {
        //no se puede usar el metodo desde el context, porque no funcionan los filtros
        const subjects = record.load ?? [];
        const totalHours = subjects.reduce((acc, subject) => acc + subject.hours, 0);
        return `${totalHours} / ${value}`; 
      },
      key: 'partTime',
      width: '3%',
      sorter: (a, b) => a.partTime - b.partTime,
      sortDirections: ['descend', 'ascend'],
    }
  ];

  const onRow = (record: Teacher) => {
    return {
      onClick: () => { setSelectedTeacherById(Number.parseInt(record.id) - 1) },
    };
  }

  return <Table pagination={{ position: ["topLeft", "none"] }} columns={columns} dataSource={data ?? []} rowKey="id" onRow={onRow} style={{ height: "100%", cursor: "pointer", gridArea: "table" }} />;
};

export default TeacherTable;