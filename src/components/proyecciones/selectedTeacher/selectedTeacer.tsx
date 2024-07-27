import { useContext } from "react";
import { MainContext } from "../../../context/mainContext";
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg";
import malePlaceHolder from "../../../assets/malePlaceHolder.svg";



export default function SelectedTeacher() { 

  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }
  const { selectedTeacher } = context;
  return (
    <div>    
      <img src={selectedTeacher?.photo ?? selectedTeacher?.gender === "m" ? malePlaceHolder : femalePlaceHolder} alt="" />
      <h1>{selectedTeacher?.name}</h1>
      <h1>{selectedTeacher?.lastName}</h1>
      <h1>{selectedTeacher?.ci}</h1>
    </div>
  );
}