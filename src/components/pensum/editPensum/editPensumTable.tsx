import { useState, useEffect } from 'react';
import { Space, Table, Button, message, Tag } from 'antd';
import type { TableProps } from 'antd';
import { MdDeleteForever, MdEdit } from "react-icons/md";
import getPensum from '../../../fetch/getPensum';
import Spinner from '../../spinner/spinner';

interface DataType {
  key: string;
  name: string;
  age: number;
  address: string;
  tags: string[];
}
interface subjet{
  id: string;
  subject: string;
  hours: number | null;
  quarter: string | null
}
export default function EditPensumTable({ programaId, trayectoId }: { programaId: string | null | undefined, trayectoId: string | null | undefined }) {

  const [list, setList] = useState<DataType[]>([])
  const [loading, setLoading] = useState<boolean>(true)



  useEffect(() => {
    if (!programaId || !trayectoId) return
    async function fetchPensum() {
      setLoading(true)
      const response = await getPensum({ programaId, trayectoId })
      setLoading(false)
      if (response.error) {
        message.error(response.error)
        return
      }
      const data = response.data
      const subjects = data.pensums
      setList(subjects.map((subject: subjet) => ({ key: subject.id, subject: subject.subject, hours: subject.hours, quarter: subject.quarter })))
    }
    fetchPensum()
  }, [programaId, trayectoId])

  const columns: TableProps<DataType>['columns'] = [
    {
      title: 'Materia',
      dataIndex: 'subject',
      key: 'subject',
      render: (text) => <h5>{text}</h5>,
    },
    {
      title: 'Holas Semanales',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours) =>{
        if(!hours) return <Tag color="red">Sin horas asignadas</Tag>
        return <h5>{`${hours} ${hours === "1" ? "hora" : "horas"} a la semana`}</h5>
      } 
    },
    {
      title: 'Trimestre',
      dataIndex: 'quarter',
      key: 'quarter',
      render: (data) => {
        if(!data) return <Tag color="red">Sin trimestre</Tag>
        const quarters = data.replace("[", "").replace("]", "").split(",")
        return (
          <Space size="middle">
            {
              quarters.map((quarter: string, index: number) => {
                return <Tag color="blue" key={index}>{quarter}</Tag>
              })
            }  
          </Space>
        );
      },
    },
    {
      title: 'Accion',
      key: 'action',
      render: (subject) => (
        <Space size="middle">
          <Button type="primary" shape='circle' icon={<MdEdit />}  onClick={() => { console.log(subject) }} />
          <Button type="primary" shape='circle' icon={<MdDeleteForever />} danger  onClick={() => {console.log(subject.key)}}/>
        </Space>
      ),
    },
  ];

  if(!programaId || !trayectoId) return <p style={{ textAlign: "center", color: "gray"}}>Seleccione un programa y un trayecto</p>
  if(loading) return <Spinner/>
  return <Table<DataType> columns={columns} dataSource={list} pagination={{ position: ["topLeft", "none"] }} style={{ width: "100%", height: "calc(100vh - 250px)", overflowY:"auto" }}/>
}