import "./pensum.css"
import { useContext, useState } from "react"
import { MainContext } from "../../context/mainContext"
import { MainContextValues } from "../../interfaces/contextInterfaces"
import { Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import TablePensum from "./table/table";



export default function ProyeccionesSubjects() {
  const { subjects } = useContext(MainContext) as MainContextValues
  const [errorRadio, setErrorRadio] = useState(true);
  
  const onChangeRadioError = (e: RadioChangeEvent) => {
    //console.log('radio checked', e.target.value);
    setErrorRadio(e.target.value);
  };

 
  return (<>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem"}}>
      <h1 >Materias en la Proyección</h1>
    
      <Radio.Group onChange={onChangeRadioError} value={errorRadio} >
        <Radio value={true} style={{ color: "white" }}>Todas</Radio>
        <Radio value={false} style={{ color: "white" }}>Error</Radio>
      </Radio.Group>
    </div>

    <TablePensum subjects={
      errorRadio
        ? subjects
        : subjects?.filter((subject) => {
          return Object.values(subject).some(value => value === null);
        })
    } />
  </>
  )
}