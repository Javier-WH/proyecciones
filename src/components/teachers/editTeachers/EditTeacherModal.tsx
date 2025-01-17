import { Modal, Input, InputNumber, message } from 'antd';
import type { InputNumberProps } from 'antd';
import { Teacher } from '../../../interfaces/teacher';
import { useEffect, useState } from 'react';
//import { MainContext } from '../../../context/mainContext';
//import { MainContextValues } from '../../../interfaces/contextInterfaces';

export default function EditTeacherModal({ teacherData, setTeacherData}: { teacherData: Teacher | null, setTeacherData: (teacherData: Teacher | null) => void }) {


  //const { setTrayectosList } = useContext(MainContext) as MainContextValues

  const [isModalOpen, setIsModalOpen] = useState(false)

  const [name, setName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [ci, setCi] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [partTime, setPartTime] = useState<number>(0)
  const [perfilName, setPerfilName] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [gender, setGender] = useState<string>('')



  useEffect(() => {
    if (teacherData !== null) {
      setName(teacherData.name)
      setLastName(teacherData.lastName)
      setCi(teacherData.ci)
      setType(teacherData.type)
      setPartTime(teacherData.partTime)
      setPerfilName(teacherData.perfilName)
      setTitle(teacherData.title)
      setGender(teacherData.gender)
      setIsModalOpen(true)
      //console.log(teacherData)
    }
    else {
      setIsModalOpen(false)
    }
  }, [teacherData])


  const handleCancel = () => {
    setTeacherData(null)
  }


  const handleOk = async () => {

  }

  return <Modal title="Editar Profesor" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
    <div className='edit-teacher-modal-container'>

      <div className='edit-teacher-modal-row'>
        <label>Nombre</label>
        <Input placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Apellido</label>
        <Input placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Cédula</label>
        <Input placeholder="Cédula" value={ci} onChange={e => setCi(e.target.value)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Tipo</label>
        <Input placeholder="Tipo" value={type} onChange={e => setType(e.target.value)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Horas</label>
        <InputNumber min={0} value={partTime} onChange={(value) => setPartTime(value ?? 0)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Perfil</label>
        <Input placeholder="Perfil" value={perfilName} onChange={e => setPerfilName(e.target.value)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Título</label>
        <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className='edit-teacher-modal-row'>
        <label>Género</label>
        <Input placeholder="Género" value={gender} onChange={e => setGender(e.target.value)} />
      </div>

    </div>
  </Modal>
}