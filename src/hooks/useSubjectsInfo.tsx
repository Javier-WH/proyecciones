import { useContext } from "react"
import { MainContext } from "../context/mainContext"
import { MainContextValues } from "../interfaces/contextInterfaces"
import { Subject } from "../interfaces/subject"
export default function useSubjectsInfo() {
  const { teachers, subjects, selectedQuarter } = useContext(MainContext) as MainContextValues
  if (!teachers || !subjects) return { tankenSubjects: [], aviableSubjects: subjects || [] }
  //const tankenSubjects: Array<Subject> = teachers[selectedQuarter]?.map(teacher => teacher.load).flat() as Array<Subject>
  const tankenSubjects: Array<Subject> = teachers[selectedQuarter]?.map(teacher =>
    teacher.load?.map(subject => ({
      ...subject,
      teacherName: `${teacher.lastName} ${teacher.name}`,
      teacherCi: teacher.ci
    }))
  ).flat() as Array<Subject>;

  //console.log(tankenSubjects)
  return {tankenSubjects, aviableSubjects: subjects}
}