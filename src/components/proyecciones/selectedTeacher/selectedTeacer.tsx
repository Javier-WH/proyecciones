import { useContext } from "react";
import { MainContext } from "../../../context/mainContext";



export default function SelectedTeacher() { 

  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }
  const { selectedTeacher } = context;
  return (
    <div>    
      <h1>{selectedTeacher?.name}</h1>
      <h1>{selectedTeacher?.lastName}</h1>
      <h1>{selectedTeacher?.ci}</h1>
    </div>
  );
}