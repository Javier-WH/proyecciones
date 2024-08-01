import  { Teacher } from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";
export interface MainContextValues {
  teachers: Array<Teacher> | null;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>
  selectedTeacher: Teacher | null;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>
  setSelectedTeacherById(id: number): void
  getTeachersHoursData(id: number): {partTime: number, asignedHpours: number, aviableHours: number},
  selectedTeacerId : number | null,
  setSelectedTeacerId : React.Dispatch<React.SetStateAction<number | null>>
  subjects: Array<Subject> | null,
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
}