import  { Teacher } from "../interfaces/teacher";
export interface MainContextValues {
  teachers: Array<Teacher> | null;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>
  selectedTeacher: Teacher | null;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>
  setSelectedTeacherById(id: number): void
}