import { MainContext } from "../../context/mainContext";
import { useContext } from "react";
import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacer";
import "./proyeccionesContainer.css"

export default function ProyeccionesContainer() {
  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }


  return <>
    <div className="title-bar-container">
      <h1>Proyecciones</h1>
    </div>
    <div className="proyecciones-container-data">
      <TeacherTable />
      <SelectedTeacher />
    </div>
  </>
}