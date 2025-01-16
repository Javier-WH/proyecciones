import { Modal, Input, InputNumber, message } from 'antd';
import type { InputNumberProps } from 'antd';
import { Trayecto } from '../../interfaces/trayecto';
import { useEffect, useState, useContext } from 'react';
import { MainContext } from '../../context/mainContext';
import { MainContextValues } from '../../interfaces/contextInterfaces';
import putTrayecto from '../../fetch/putTrayecto';
import getTrayectos from '../../fetch/getTrayectos';



export default function TrayectoModal({ trayecto, setSelectedTrayecto }: { trayecto: Trayecto | null, setSelectedTrayecto: (trayecto: Trayecto | null) => void }) {

  const { setTrayectosList } = useContext(MainContext) as MainContextValues

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [orderValue, setOrderValue] = useState<number>(0)
  const [nameValue, setNameValue] = useState<string>('')

  useEffect(() => {
    if(trayecto){
      setIsModalOpen(true)
      setOrderValue(trayecto.order)
      setNameValue(trayecto.name)
    }else{
      setIsModalOpen(false)
    }
  }, [trayecto])


  const onOrderChange: InputNumberProps['onChange'] = (value) => {
    if(typeof value !== 'number') return

    setOrderValue(value)
  };

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value)
  }

  const handleCancel = () => {
    setSelectedTrayecto(null)
  }

  const handleOk = async () => {
    if(!trayecto) return
    const response = await putTrayecto({id: trayecto.id, name: nameValue, order: orderValue})
    if(response.error){
      message.error(response.error)
      return
    }

    if(response){
      const trayectos = await getTrayectos()
      if(trayectos){
        setTrayectosList(trayectos)
        handleCancel();
      }
    }
      
  }


  return  <Modal title="Edición de Tryaecto" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
    <div>
    <span className='trayecto-modal-trayectoID'>{`id: ${trayecto?.id}`}</span>
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