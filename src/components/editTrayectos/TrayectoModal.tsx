import { Modal } from 'antd';
import { Trayecto } from '../../interfaces/trayecto';
import {useEffect, useState} from 'react';


export default function TrayectoModal({ trayecto, setSelectedTrayecto }: { trayecto: Trayecto | null, setSelectedTrayecto: (trayecto: Trayecto | null) => void }) {

  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if(trayecto){
      setIsModalOpen(true)
    }else{
      setIsModalOpen(false)
    }
  }, [trayecto])


  const handleOk = () => {

  }
  const handleCancel = () => {
    setSelectedTrayecto(null)
  }

  return  <Modal title="Basic Modal" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
    <p>Some contents...</p>
    <p>Some contents...</p>
    <p>Some contents...</p>
  </Modal>
}