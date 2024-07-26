import { createContext, ReactNode, useState} from "react"
import { MainContextValues } from "../interfaces/contextInterfaces"; 
import { Teacher } from "../interfaces/teacher";


//Place Holder Data
import { teachersList } from "../dev/placeHolderData";

export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [teachers, setTeachers] = useState<Teacher[]>(teachersList);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const setSelectedTeacherById = (id: number) => {
    setSelectedTeacher(teachers[id]);
  }
  const values = {
    teachers,
    setTeachers,
    selectedTeacher, 
    setSelectedTeacher,
    setSelectedTeacherById
  }


  return (
    <MainContext.Provider value={values}>
      {children}
    </MainContext.Provider>
  );
}


