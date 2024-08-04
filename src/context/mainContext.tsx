import { createContext, ReactNode, useEffect, useState} from "react"
import { MainContextValues } from "../interfaces/contextInterfaces"; 
import { Teacher, Quarter} from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";
import AddSubjectToTeacherModal from "../components/addSubjectToTeacherModal/addSubjectToTeacherModal";
import ChangeSubjectFromTeacherModal from "../components/changeSubjectFromTeacherModal/changeSubjectFromTeacherModal";
import fetchTeacherData from "../fetch/fetchTeacherData";
import fetchSubjectsData from "../fetch/fetchSubjectsData";



export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [teachers, setTeachers] = useState< Quarter | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<"q1" | "q2" | "q3">("q1");
  const [selectedTeacerId, setSelectedTeacerId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [openAddSubjectToTeacherModal, setOpenAddSubjectToTeacherModal] = useState(false);
  const [openChangeSubjectFromTeacherModal, setOpenChangeSubjectFromTeacherModal] = useState(false);


  useEffect(() => {
    fetchTeacherData().then((data) => {
      setTeachers(data);
    })

    fetchSubjectsData().then((data) => {
      setSubjects(data);
    })
  }, []);


  const setSelectedTeacherById = (id: string) => {
    if (!teachers) return;
    const teacher = teachers[selectedQuarter].find(teacher => teacher.id === id);
    setSelectedTeacerId(id);
    setSelectedTeacher(teacher || null);
  }

  const getTeachersHoursData = (id: number) => {
    if (!teachers) return;
    const subjects = teachers[selectedQuarter][id]?.load ?? [];
    const asignedHpours = subjects.reduce((acc, subject) => acc + subject.hours, 0);

    return {
      partTime: teachers[selectedQuarter][id]?.partTime,
      asignedHpours,
      aviableHours: teachers[selectedQuarter][id]?.partTime - asignedHpours
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
    setOpenAddSubjectToTeacherModal,
    openChangeSubjectFromTeacherModal, 
    setOpenChangeSubjectFromTeacherModal,
    selectedSubject,
    setSelectedSubject,
    selectedQuarter, 
    setSelectedQuarter
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
        selectedQuarter = {selectedQuarter}
        setSelectedQuarter = {setSelectedQuarter}

      />
      <ChangeSubjectFromTeacherModal 
        open={openChangeSubjectFromTeacherModal} 
        setOpen={setOpenChangeSubjectFromTeacherModal}
        teachers = {teachers}
        setTeachers = {setTeachers}
        selectedTeacerId = {selectedTeacerId}
        subjects = {subjects}
        setSubjects = {setSubjects}
        selectedSubject = {selectedSubject}
        selectedQuarter={selectedQuarter}
      />
    </MainContext.Provider>
  );
}


