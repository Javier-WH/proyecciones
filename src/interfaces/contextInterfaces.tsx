import  { Teacher } from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";
export interface MainContextValues {
  teachers: Array<Teacher> | null;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  selectedTeacher: Teacher | null;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>;
  setSelectedTeacherById(id: string): void;
  getTeachersHoursData(id: number): {partTime: number, asignedHpours: number, aviableHours: number};
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
}