import { Quarter, Teacher } from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";

export interface setSubjectDataType {
  teacherArray: Quarter;
  subjectArray: Subject[];
}

export default function useSetSubject(info: setSubjectDataType) {
  const addSubjectToTeacher = ({
    subjectId,
    teacherId,
  }: {
    subjectId: string;
    teacherId: string;
  }): setSubjectDataType => {
    const subjectArray: Subject[] = [...info.subjectArray];
    const teacherArray: Quarter = info.teacherArray;

    const subjectIndex = subjectArray.findIndex((subject: Subject) => subject.innerId === subjectId);

    const subject = subjectArray[subjectIndex];

    //se agrega la materia al profesor
    subjectArray[subjectIndex].quarter.forEach((quarter) => {
      teacherArray[`q${quarter}` as "q1" | "q2" | "q3"].forEach((teacher: Teacher) => {
        if (teacher.id === teacherId) {
          if (subject.quarter.includes(quarter)) {
            teacher?.load?.push(subject);
          }
        }
      });
    });

    // se elimina la materia de la lista de materias
    subjectArray.splice(subjectIndex, 1);

    return { subjectArray, teacherArray };
  };

  const removeSubjectFromTeacher = ({
    subject,
    teacherId,
  }: {
    subject: Subject;
    teacherId: string;
  }): setSubjectDataType => {
    const subjectArray: Subject[] = [...info.subjectArray];
    const teacherArray: Quarter = info.teacherArray;

    // remover la materia del profesor

    console.log(subject);

    return { subjectArray, teacherArray };
  };

  return { addSubjectToTeacher, removeSubjectFromTeacher };
}

