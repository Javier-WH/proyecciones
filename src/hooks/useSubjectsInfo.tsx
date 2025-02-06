import { useContext } from "react"
import { MainContext } from "../context/mainContext"
import { MainContextValues } from "../interfaces/contextInterfaces"
import { Subject } from "../interfaces/subject"
export default function useSubjectsInfo() {
  const { teachers, subjects, selectedQuarter } = useContext(MainContext) as MainContextValues
  if (!teachers || !subjects) return { tankenSubjects: [], aviableSubjects: subjects || [] }
  const tankenSubjects: Array<Subject> = teachers[selectedQuarter]?.map(teacher => teacher.load).flat() as Array<Subject>
  return {tankenSubjects, aviableSubjects: subjects}
}