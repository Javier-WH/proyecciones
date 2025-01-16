import { useContext, useState } from "react"
import { MainContext } from "../../context/mainContext"
import { MainContextValues } from "../../interfaces/contextInterfaces"
import { Trayecto } from "../../interfaces/trayecto"
import TrayectoModal from "./TrayectoModal"
import NewTrayectoModal from "./newTrayectoModal"
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Button, message, Popconfirm } from 'antd';
import type { PopconfirmProps } from 'antd';
import deleteTrayecto from "../../fetch/deleteTrayecto"
import getTrayectos from '../../fetch/getTrayectos';
import './EditTrayectos.css'



export default function EditTrayectos() {

  const { setTrayectosList } = useContext(MainContext) as MainContextValues

  const { trayectosList } = useContext(MainContext) as MainContextValues
  const [selectedTrayecto, setSelectedTrayecto] = useState<Trayecto | null>(null)
  const [newTrayectoModalOpen, setNewTrayectoModalOpen] = useState<boolean>(false)


  const sortTrayectos = () => {
    if (trayectosList === undefined || trayectosList === null) return [];
    return trayectosList.sort((a: Trayecto, b: Trayecto) => a.order - b.order);
  }

  const onClickEdit = (trayecto:Trayecto) => {
    setSelectedTrayecto(trayecto)
  }

  const onClickDelete = async (trayecto:Trayecto) => {
    const id = trayecto.id
    const response = await deleteTrayecto({id})
    if(!response){
      message.error("No se ha podido eliminar el trayecto")
      return
    }
    const trayectos = await getTrayectos()
    setTrayectosList(trayectos)
    message.success("Trayecto eliminado")
  }

  return <>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1>Editar Lista de Trayectos</h1>
    </div>

    <TrayectoModal trayecto={selectedTrayecto} setSelectedTrayecto={setSelectedTrayecto} />
    <NewTrayectoModal isModalOpen={newTrayectoModalOpen} setIsModalOpen={setNewTrayectoModalOpen} />

    <div style={{ width: '80%', display: 'flex', justifyContent: 'space-evenly', columnGap: '20px', margin: '10px 20px', flexDirection: "column"}}>

      <div style={{ width: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {
          sortTrayectos().length === 0
          ? <h2>No se han encontrado trayectos</h2> 
          :sortTrayectos().map(trayecto => {
            return <div 
              key={trayecto.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '5px 10px', 
                margin: '5px 5px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '1.1em',
              }}
              className="trayecto-card"
              
            >
                <span>{trayecto.name}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', columnGap: '10px' }}>
                <Button type="primary" shape="circle" icon={<FiEdit2 />} onClick={() => onClickEdit(trayecto)} />
                <Popconfirm
                  title="¿Estas seguro que deseas eliminar este trayecto?"
                  description="Esta operacion NO se puede deshacer"
                  onConfirm={() => onClickDelete(trayecto)}
                  //onCancel={cancel}
                  okText="Si"
                  cancelText="No"
                >
                  <Button type="primary" shape="circle" icon={<FiTrash2 />} danger/>
                </Popconfirm>
                </div>
              </div>
          })

        }
      </div>
  
        <div style={{
          width: '80%',
          display: 'flex',
          justifyContent: 'right',
          marginTop: '20px',
        }}>
            <Button type="primary" onClick={()=> setNewTrayectoModalOpen(true)}>Agregar Trayecto</Button>
        </div>
    </div>
  </>

}