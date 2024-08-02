import { createContext, ReactNode, useState} from "react"
import { MainContextValues } from "../interfaces/contextInterfaces"; 
import { Teacher } from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";
import AddSubjectToTeacherModal from "../components/addSubjectToTeacherModal/addSubjectToTeacherModal";


//Place Holder Data
import { teachersList } from "../dev/placeHolderData";
import { subjectsList } from "../dev/placeHolderSubjects";

export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [teachers, setTeachers] = useState<Teacher[]>(teachersList);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedTeacerId, setSelectedTeacerId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(subjectsList);
  const [openAddSubjectToTeacherModal, setOpenAddSubjectToTeacherModal] = useState(false);

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
    setSelectedTeacerId,
    subjects, 
    setSubjects,
    openAddSubjectToTeacherModal, 
    setOpenAddSubjectToTeacherModal
  }


  return (
    <MainContext.Provider value={values}>
      {children}
      <AddSubjectToTeacherModal 
        open={openAddSubjectToTeacherModal} 
        setOpen={setOpenAddSubjectToTeacherModal}
        teachers = {teachers}
        setTeachers = {setTeachers}
        selectedTeacerId = {selectedTeacerId}
        subjects = {subjects}
        setSubjects = {setSubjects}

      />
    </MainContext.Provider>
  );
}


