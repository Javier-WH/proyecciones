import  { Teacher, Quarter } from "../interfaces/teacher";
import { Subject, SimpleSubject } from "../interfaces/subject";
import { PNF } from "../interfaces/pnf";
import { Trayecto } from "./trayecto";
 
export interface MainContextValues {
  teachers: Quarter | null;
  setTeachers: React.Dispatch<React.SetStateAction<Quarter | null>>;
  selectedTeacher: Teacher | null;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>;
  setSelectedTeacherById(id: string): void;
  getTeachersHoursData(id: number): {partTime: number | null, asignedHpours: number | null, aviableHours: number | null};
  selectedTeacerId : string | null;
  setSelectedTeacerId : React.Dispatch<React.SetStateAction<string | null>>;
  subjects: Array<Subject> | null;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  openAddSubjectToTeacherModal : boolean; 
  setOpenAddSubjectToTeacherModal: React.Dispatch<React.SetStateAction<boolean>>;
  openChangeSubjectFromTeacherModal: boolean;
  setOpenChangeSubjectFromTeacherModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSubject: Subject | null;
  setSelectedSubject : React.Dispatch<React.SetStateAction<Subject | null>>;
  selectedQuarter : "q1" | "q2" | "q3"; 
  setSelectedQuarter : React.Dispatch<React.SetStateAction<"q1" | "q2" | "q3">>;
  handleTeacherChange: (data: Quarter) => void;
  handleSubjectChange: (data: Subject[]) => void;
  pnfList: Array<PNF> | null;
  subjectList: Array<SimpleSubject> | null;
  trayectosList: Array<Trayecto> | null;
  setTrayectosList: React.Dispatch<React.SetStateAction<Trayecto[]>>
}