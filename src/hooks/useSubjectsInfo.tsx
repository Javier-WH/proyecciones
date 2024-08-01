import { useContext } from "react"
import { MainContext } from "../context/mainContext"
import { MainContextValues } from "../interfaces/contextInterfaces"
import { Subject } from "../interfaces/subject"
export default function useSubjectsInfo() {
  const { teachers, subjects } = useContext(MainContext) as MainContextValues
  const tankenSubjects: Array<Subject> = teachers?.map(teacher => teacher.load).flat() as Array<Subject>
  return {tankenSubjects, aviableSubjects: subjects}
}