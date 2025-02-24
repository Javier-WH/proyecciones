import { Quarter, Teacher } from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";

export interface setSubjectDataType {
  teacherArray: Quarter;
  subjectArray: Subject[];
}

export default function useSetSubject(setSubjectDataType) {
  const addSubjectToTeacher = (subject: Subject): setSubjectDataType => {};
}
