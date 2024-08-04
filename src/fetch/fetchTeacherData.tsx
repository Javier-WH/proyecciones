//Place Holder Data
import { teachersList } from "../dev/placeHolderData";
import {  Quarter } from "../interfaces/teacher";

export default async function fetchTeacherData(): Promise<Quarter> {

  const quarter: Quarter = {
    q1: teachersList,
    q2: teachersList,
    q3: teachersList,
  }
  return quarter
}