import { useEffect, useState } from "react";
import { Subject } from "../interfaces/subject";
import { Teacher } from "../interfaces/teacher";

export interface useSubjectDataType {
  subjectId: string | null;
  teacherId: string | null;
}

export interface useSubjectResponse {
  error: boolean;
  message: string;
  data: Subject[] | null;
}

export interface TeacherHourData {
  totalHours: string;
  aviableHours: string;
  usedHours: string;
  overloaded: boolean;
}
export interface useSubjectResponseTeacherHours {
  error: boolean;
  message: string;
  data: { q1: TeacherHourData | null; q2: TeacherHourData | null; q3: TeacherHourData | null } | null;
}

export default function useSetSubject(SubjectArray: Subject[]) {
  const [subjectList, setSubjectList] = useState<Subject[]>([]);

  useEffect(() => {
    const subjectArrayCopy = [...SubjectArray];
    setSubjectList(subjectArrayCopy);
  }, [SubjectArray]);

  /**
   * Asigna una materia a un profesor
   * @param {string|null} subjectId - Id de la materia a asignar (innerID)
   * @param {string|null} teacherId - Id del profesor al que se asigna la materia
   * @returns {useSubjectResponse} - Un objeto que indica si hubo error, un mensaje asociado y la lista de materias actualizada
   */
  const addSubjectToTeacher = ({ subjectId, teacherId }: useSubjectDataType): useSubjectResponse => {
    if (teacherId === null || subjectId === null) {
      return {
        error: true,
        message: "No ha suministrado los datos necesarios",
        data: null,
      };
    }

    const subjectIndex = subjectList.findIndex((subject) => subject.innerId === subjectId);
    // se obtienen los trimestres donde se da la materia
    const subjectQuarter = Object.keys(subjectList[subjectIndex].quarter) as Array<
      keyof (typeof subjectList)[number]["quarter"]
    >;
    // a cada trimestre que se de la materia se agrega el profesor
    for (let quarter of subjectQuarter) {
      subjectList[subjectIndex].quarter[quarter] = teacherId;
    }

    return {
      error: false,
      message: "Se ha asignado la materia al profesor correctamente",
      data: subjectList,
    };
  };

  /**
   * Elimina una materia de un profesor
   * @param {string|null} subjectId - Id de la materia a eliminar
   * @param {string|null} teacherId - Id del profesor al que se elimina la materia
   * @returns {useSubjectResponse} - Un objeto que indica si hubo error, un mensaje asociado y la lista de materias actualizada
   */
  const removeSubjectFromTeacher = ({ subjectId, teacherId }: useSubjectDataType): useSubjectResponse => {
    if (teacherId === null || subjectId === null) {
      return {
        error: true,
        message: "No ha suministrado los datos necesarios",
        data: null,
      };
    }

    const subjectIndex = subjectList.findIndex((subject) => subject.innerId === subjectId);
    // se obtienen los trimestres donde se da la materia
    const subjectQuarter = Object.keys(subjectList[subjectIndex].quarter) as Array<
      keyof (typeof subjectList)[number]["quarter"]
    >;
    // a cada trimestre que se de la materia se  elimina el profesor si es que da la materia
    for (let quarter of subjectQuarter) {
      if (subjectList[subjectIndex].quarter[quarter] === teacherId) {
        subjectList[subjectIndex].quarter[quarter] = null;
      }
    }

    return {
      error: false,
      message: "Se ha removido la materia al profesor correctamente",
      data: subjectList,
    };
  };

  /**
   * Calculates the hourly load data for a given teacher across specified quarters.
   *
   * @param {Teacher} teacher - The teacher for whom the hourly data is being calculated.
   * @returns {useSubjectResponseTeacherHours} - An object containing error status, message,
   * and the calculated hourly data for quarters q1, q2, and q3. If the teacher is not provided,
   * it returns an error with a message indicating the missing teacher data.
   */

  const getTeacherHoursData = (teacher: Teacher): useSubjectResponseTeacherHours => {
    if (!teacher) {
      return {
        error: true,
        message: "No ha suministrado un profesor",
        data: null,
      };
    }

    const totalHours = teacher.partTime ?? 0;

    const getHourData = (quarter: "q1" | "q2" | "q3"): TeacherHourData => {
      const asignedSubjects = subjectList.filter((subject) => subject.quarter[quarter] === teacher.id);
      const usedHours = asignedSubjects.reduce((acc, subject) => {
        return Number(acc) + Number(subject.hours[quarter] ?? 0);
      }, 0);
      const aviableHours = totalHours - usedHours < 0 ? 0 : totalHours - usedHours;
      const overloaded = usedHours > totalHours;

      return {
        totalHours: totalHours.toString(),
        aviableHours: aviableHours.toString(),
        usedHours: usedHours.toString(),
        overloaded,
      };
    };

    return {
      error: false,
      message: "Se ha calculado correctamente la carga horaria del profesor",
      data: {
        q1: getHourData("q1"),
        q2: getHourData("q2"),
        q3: getHourData("q3"),
      },
    };
  };

  return { addSubjectToTeacher, removeSubjectFromTeacher, getTeacherHoursData };
}

