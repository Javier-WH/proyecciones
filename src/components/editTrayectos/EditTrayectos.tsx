import { useContext, useEffect, useState } from "react"
import { MainContext } from "../../context/mainContext"
import { MainContextValues } from "../../interfaces/contextInterfaces"
import { Trayecto } from "../../interfaces/trayecto"
import TrayectoModal from "./TrayectoModal"
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Button} from 'antd';
import './EditTrayectos.css'



export default function EditTrayectos() {

  const { trayectosList } = useContext(MainContext) as MainContextValues
  const [selectedTrayecto, setSelectedTrayecto] = useState<Trayecto | null>(null)


  const sortTrayectos = () => {
    if (trayectosList === undefined || trayectosList === null) return [];
    return trayectosList.sort((a: Trayecto, b: Trayecto) => a.order - b.order);
  }

  const onClick = (trayecto:Trayecto) => {
    setSelectedTrayecto(trayecto)
  }

  return <>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1>Editar Lista de Trayectos</h1>
    </div>

    <TrayectoModal trayecto={selectedTrayecto} setSelectedTrayecto={setSelectedTrayecto} />

    <div style={{ width: '80%', display: 'flex', justifyContent: 'space-evenly', columnGap: '20px', margin: '10px 20px', flexDirection: "column"}}>

      <div style={{ width: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {
          sortTrayectos().map(trayecto => {
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
                <Button type="primary" shape="circle" icon={<FiEdit2 />} onClick={()=> onClick(trayecto)} />
                <Button type="primary" shape="circle" icon={<FiTrash2 />} danger/>
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
            <Button type="primary">Agregar Trayecto</Button>
        </div>
    </div>
  </>

}