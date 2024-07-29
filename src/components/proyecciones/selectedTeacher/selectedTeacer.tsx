import { useContext } from "react";
import { MainContext } from "../../../context/mainContext";
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";
import Subjects from "./subjects/subjects";



export default function SelectedTeacher() { 

  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }
  const { selectedTeacher } = context;

  if(!selectedTeacher){
    return <div className="selected-teacher-container">    
      <div>No hay docente seleccionado</div>
    </div>
  }

  return (
    <div className="selected-teacher-container">    
    <div style={{ display: "flex" }}>
      <img src={selectedTeacher?.gender === "m" ? malePlaceHolder : femalePlaceHolder} alt="" />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: "20px" }}>
          <span className="teacher-name">{`${selectedTeacher?.name} ${selectedTeacher?.lastName}`}</span>
          <span className="teacher-info">{`CI: ${selectedTeacher?.ci}`}</span>
          <span className="teacher-info">{`Titulo: ${selectedTeacher?.title}`}</span>
          <span className="teacher-info">{`Tipo de contrato: Tiempo Completo`}</span>
          <span className="teacher-info">{`Horas disponibles: ${selectedTeacher?.partTime}`}</span>
          <span className="teacher-info">{`Horas asignadas: ${selectedTeacher?.partTime}`}</span>
        </div>

    </div>
      
      <Subjects data={selectedTeacher?.load}/>
   
    </div>
  );
}