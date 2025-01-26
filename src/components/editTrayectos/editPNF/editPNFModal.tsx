import { Modal, Input, Radio, message } from 'antd';
import type {  RadioChangeEvent } from 'antd';
import { useEffect, useState } from 'react';
import postPNF from '../../../fetch/postPNF';


interface PNF {
  id: string
  name: string
  saga_id: number
  active: boolean
}

export default function EditPNFModal({ programa, setprograma, isModalOpen, setIsModalOpen, fetchPnf }
  : { 
    programa: PNF | null, 
    setprograma: (programa: PNF | null) => void, 
    isModalOpen: boolean, 
    setIsModalOpen: (value: boolean) => void,
    fetchPnf: () => void 
  }) {

  const [okButonName, setOkButonName] = useState("")
  const [name, setName] = useState("")
  const [active, setActive] = useState<"1" | "0">("1")


  useEffect(() => {
    if (!programa) {
      setIsModalOpen(false)
      setOkButonName("Crear")
      setName("")
      setActive("1")
    }
    else {
      setIsModalOpen(true)
      setOkButonName("Actualizar")
      setName(programa.name)
      setActive(programa.active ? "1" : "0")
    }
  }, [programa, setIsModalOpen])





  const handleCancel = () => {
    setprograma(null)
    setIsModalOpen(false)
  }


  const handleOk = async () => {

    if (name.length === 0) {
      message.warning("Por favor, ingrese un nombre para el programa")
      return
    }

    const params: { id: string | undefined, name: string, active: number | undefined, saga_id: number | undefined } = {
      id: undefined,
      name: name,
      active: parseInt(active),
      saga_id: undefined
    }

    programa && (params.id = programa.id) 

    const response = await postPNF(params)
    if (response.error) {
      message.error(response.error)
      return
    }

    fetchPnf()
    setprograma(null)
    setIsModalOpen(false)

  }

  const handleRadioChange = (e: RadioChangeEvent) => {
    setActive(e.target.value);
  };

  return <Modal
    title={`${okButonName} Programa`}
    open={isModalOpen}
    onOk={handleOk}
    onCancel={handleCancel}
    okText={okButonName}
    cancelText="Cancelar"
  >
    <div style={{ marginBottom: "10px" }}>
      Programa
      <Input placeholder="Nombre del programa" value={name} onChange={(e) => setName(e.target.value)} />
    </div>

    {
      programa &&
      <div>
      <Radio.Group
        options={[
          { label: 'Activo', value: '1' },
          { label: 'Inactivo', value: '0' }
        ]}
        defaultValue="1"
        optionType="button"
        buttonStyle="solid"
        value={active}
        onChange={handleRadioChange}
        />
    </div>
    }
  </Modal>
}