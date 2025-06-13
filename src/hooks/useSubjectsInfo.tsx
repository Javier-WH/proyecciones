import { useContext } from "react"
import { MainContext } from "../context/mainContext"
import { MainContextValues } from "../interfaces/contextInterfaces"
import { Subject } from "../interfaces/subject"
export default function useSubjectsInfo() {
  const { teachers, subjects } = useContext(MainContext) as MainContextValues
  if (!teachers || !subjects) return { tankenSubjects: [], aviableSubjects: subjects || [] }

  const tankenSubjects: Array<Subject> = teachers?.map(teacher =>
    teacher.load?.map(subject => ({
      ...subject,
      teacherName: `${teacher.lastName} ${teacher.name}`,
      teacherCi: teacher.ci
    }))
  ).flat() as Array<Subject>;

  //console.log(tankenSubjects)
  return {tankenSubjects, aviableSubjects: subjects}
}