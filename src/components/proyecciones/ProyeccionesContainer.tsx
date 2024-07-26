import { MainContext } from "../../context/mainContext";
import { useContext } from "react";
import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacer";

export default function ProyeccionesContainer() {
  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }


  return <>
    <h1>Proyecciones</h1>
    <TeacherTable />
    <SelectedTeacher />
  </>
}