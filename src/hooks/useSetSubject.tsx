import { Quarter, Teacher } from "../interfaces/teacher";
import { Subject } from "../interfaces/subject";

export interface setSubjectDataType {
  teacherArray: Quarter | {};
  subjectArray: Subject[];
}

export default function useSetSubject(info: setSubjectDataType) {
  const addSubjectToTeacher = ({
    subject,
    teacherId,
  }: {
    subject: Subject;
    teacherId: string;
  }): setSubjectDataType => {
    const subjectArray = [...info.subjectArray];
    const teacherArray = { ...info.teacherArray };

    //se agrega la materia al profesor
    subject.quarter.forEach((quarter) => {
      (teacherArray as { [key: string]: Teacher[] })[`q${quarter}`].forEach((teacher: Teacher) => {
        if (teacher.id === teacherId) {
          if (subject.quarter.includes(quarter)) {
            teacher?.load?.push(subject);
          }
        }
      });
    });

    // se elimina la materia de la lista de materias

    return { subjectArray, teacherArray };
  };

  return { addSubjectToTeacher };
}

