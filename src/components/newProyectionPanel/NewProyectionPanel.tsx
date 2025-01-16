import { useContext, useEffect, useState } from "react"
import { MainContext } from "../../context/mainContext"
import { MainContextValues } from "../../interfaces/contextInterfaces"
import { Select, SelectProps } from 'antd';
import NewProyectionContainer from "./newProyectionContainer/NewProyectionContainer";

export default function NewProyectionPanel() {

  const { pnfList, trayectosList } = useContext(MainContext) as MainContextValues
  const [pnfOptions, setPnfOptions] = useState<SelectProps['options'] | []>([])
  const [pnfLabel, setPnfLabel] = useState<string | null>(null)
  const [pnfValue, setPnfValue] = useState<string | null>(null)


  const [trayectoOptions, setTrayectoOptions] = useState<SelectProps['options'] | []>([])
  const [trayectoLabel, setTrayectoLabel] = useState<string | null>(null)
  const [trayectoValue, setTrayectoValue] = useState<string | null>(null)
  const [trayectoDataValue, setTrayectoDataValue] = useState<string | null>(null)



  useEffect(() => {
    if (!pnfList) return
    setPnfOptions(pnfList.map(pnf => ({ value: pnf.id.toString(), label: pnf.name.toString() })))
    setPnfLabel(pnfList[0]?.name?.toString())
    setPnfValue(pnfList[0]?.id?.toString())
  }, [pnfList])

  useEffect(() => {
    if (!trayectosList) return
    setTrayectoOptions(trayectosList.map(trayecto => ({ value: trayecto.id.toString(), label: trayecto.name.toString() })))
    setTrayectoLabel(trayectosList[0]?.name?.toString())
    setTrayectoValue(trayectosList[0]?.id?.toString())
  }, [trayectosList])

  const handlePnfChange = (value: string) => {
    const pnfName = pnfList?.filter((pnf) => pnf.id === value)[0].name
    setPnfLabel(pnfName?.toString() ?? null);
    setPnfValue(value);
  };

  // esta funcion recibe el id del trayecto seleccionado
  const handleTrayectoChange = (value: string) => {
    const selectedTrayecto = trayectosList?.filter((trayecto) => trayecto.id === value)[0]
    const trayectoName = selectedTrayecto?.name
    setTrayectoLabel(trayectoName?.toString() ?? null);

    //corrige el valor del trayecto seleccionado para que sea el trayecto anterior al seleccionado
    const selectedTrayectoOrder = selectedTrayecto?.order
    console.log({selectedTrayectoOrder})
    if (selectedTrayectoOrder) {
      const fixxedValue = selectedTrayectoOrder - 1
      console.log({fixxedValue})
      const trayectoId = trayectosList?.filter((trayecto) => trayecto.order === fixxedValue)[0].id
      setTrayectoDataValue(trayectoId?.toString() ?? null);
      return
    }
    
    setTrayectoValue(value);

  };


  return <>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1>Nueva Proyección</h1>
    </div>
    <div style={{width: '80%', display: 'flex', justifyContent: 'space-evenly', columnGap: '20px', margin: '10px 20px'}}>
      <div style={{width: '100%'}}>
        <h3 style={{color: 'gray'}}>Programa</h3>
        <Select
          value={pnfLabel}
          style={{ width: '100%' }}
          onChange={handlePnfChange}
          options={pnfOptions}
        />
      </div>
      <div style={{width: '100%'}}>
        <h3 style={{ color: 'gray' }}>Trayecto</h3>
        <Select
          value={trayectoLabel}
          style={{ width: '100%' }}
          onChange={handleTrayectoChange}
          options={trayectoOptions}
        />
      </div>
    </div>
    <NewProyectionContainer programaId={pnfValue} trayectoId={trayectoValue} trayectoDataValue ={trayectoDataValue}/>
  </>

}