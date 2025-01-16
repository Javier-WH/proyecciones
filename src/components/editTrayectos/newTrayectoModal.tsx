import { Modal, Input, InputNumber, message } from 'antd';
import type { InputNumberProps } from 'antd';
import PostTrayecto from '../../fetch/postTrayecto';
import getTrayectos from '../../fetch/getTrayectos';
import { useState, useContext } from 'react';
import { MainContext } from '../../context/mainContext';
import { MainContextValues } from '../../interfaces/contextInterfaces';

export default function NewTrayectoModal({ isModalOpen, setIsModalOpen }: { isModalOpen: boolean, setIsModalOpen: (value: boolean) => void }) {


  const { setTrayectosList } = useContext(MainContext) as MainContextValues

  const [orderValue, setOrderValue] = useState<number>(0)
  const [nameValue, setNameValue] = useState<string>('')


  const onOrderChange: InputNumberProps['onChange'] = (value) => {
    if (typeof value !== 'number') return
    setOrderValue(value)
  };

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value)
  }

  const cleanInputs = () => {
    setOrderValue(0)
    setNameValue('')
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    cleanInputs()
  }


  const handleOk = async () => {
    const response = await PostTrayecto({ name: nameValue, order: orderValue })
    if (response.error) {
      message.error(response.error)
      return
    }
    const trayectos = await getTrayectos()
    setTrayectosList(trayectos)
    cleanInputs()
    setIsModalOpen(false)
  }

  return <Modal title="Agregar un nuevo trayecto" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
    <div>
      <div className='trayecto-modal-input-container'>
        <label htmlFor="">Nombre del trayecto</label>
        <Input placeholder="escriba un nombre para el trayecto" value={nameValue} onChange={onNameChange} />
      </div>
      <div className='trayecto-modal-input-container'>
        <label htmlFor="">Orden del trayecto</label>
        <InputNumber min={0} max={100} value={orderValue} onChange={onOrderChange} />
      </div>
    </div>
  </Modal>
}