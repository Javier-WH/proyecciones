import { createContext, ReactNode, useState} from "react"
import { MainContextValues } from "../interfaces/contextInterfaces"; 
import { Teacher } from "../interfaces/teacher";


//Place Holder Data
import { teachersList } from "../dev/placeHolderData";

export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [teachers, setTeachers] = useState<Teacher[]>(teachersList);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedTeacerId, setSelectedTeacerId] = useState<number | null>(null);

  const setSelectedTeacherById = (id: number) => {
    setSelectedTeacerId(id);
    setSelectedTeacher(teachers[id]);
  }

  const getTeachersHoursData = (id: number) => {
    const subjects = teachers[id].load ?? [];
    const asignedHpours = subjects.reduce((acc, subject) => acc + subject.hours, 0);

    return {
      partTime: teachers[id].partTime,
      asignedHpours,
      aviableHours: teachers[id].partTime - asignedHpours
    }
  }

  const values = {
    teachers,
    setTeachers,
    selectedTeacher, 
    setSelectedTeacher,
    setSelectedTeacherById,
    getTeachersHoursData,
    selectedTeacerId,
    setSelectedTeacerId
  }


  return (
    <MainContext.Provider value={values}>
      {children}
    </MainContext.Provider>
  );
}


