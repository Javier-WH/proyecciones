import { Modal, Input, message } from 'antd';
import { Teacher } from '../../../interfaces/teacher';
import { useEffect, useState } from 'react';
import placeholder from './../../../assets/malePlaceHolder.svg'
//import { MainContext } from '../../../context/mainContext';
//import { MainContextValues } from '../../../interfaces/contextInterfaces';

export default function EditTeacherModal({ teacherData, setTeacherData }: { teacherData: Teacher | null, setTeacherData: (teacherData: Teacher | null) => void }) {


  //const { setTrayectosList } = useContext(MainContext) as MainContextValues

  const [isModalOpen, setIsModalOpen] = useState(false)

  const [name, setName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [ci, setCi] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [perfilName, setPerfilName] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [gender, setGender] = useState<string>('')



  useEffect(() => {
    if (teacherData !== null) {
      setName(teacherData.name)
      setLastName(teacherData.lastName)
      setCi(teacherData.ci)
      setType(teacherData.type)
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

    message.success('Profesor editado correctamente')
  }

  return <Modal title="Editar Profesor" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
    <div className='edit-teacher-modal-container'>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 5fr', gap: '5px' }}>
        <img src={placeholder} alt="" style={{ width: '165px' }} />
        <div>
          <div className='edit-teacher-modal-row'>
            <label>Nombre</label>
            <Input placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className='edit-teacher-modal-row'>
            <label>Apellido</label>
            <Input placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div className='edit-teacher-modal-row'>
            <label>Cédula</label>
            <Input placeholder="Cédula" value={ci} onChange={e => setCi(e.target.value)} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className='edit-teacher-modal-row'>
          <label>Tipo</label>
          <Input placeholder="Tipo" value={type} onChange={e => setType(e.target.value)} />
        </div>

        <div className='edit-teacher-modal-row'>
          <label>Perfil</label>
          <Input placeholder="Perfil" value={perfilName} onChange={e => setPerfilName(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className='edit-teacher-modal-row'>
          <label>Título</label>
          <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className='edit-teacher-modal-row'>
          <label>Género</label>
          <Input placeholder="Género" value={gender} onChange={e => setGender(e.target.value)} />
        </div>
      </div>

    </div>
  </Modal>
}