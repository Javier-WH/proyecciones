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

interface TeacherHourData {
  totalHours: string;
  aviableHours: string;
  usedHours: string;
}
export interface useSubjectResponseTeacherHours {
  error: boolean;
  message: string;
  data: TeacherHourData | null;
}

export default function useSetSubject(SubjectArray: Subject[]) {
  const [subjectList, setSubjectList] = useState<Subject[]>([]);

  useEffect(() => {
    const subjectArrayCopy = [...SubjectArray];
    setSubjectList(subjectArrayCopy);
  }, [SubjectArray]);

  /**
   * Asigna una materia a un profesor
   * @param {string|null} subjectId - Id de la materia a asignar
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

  const getTeacherHoursData = (
    teacher: Teacher,
    quarter: "q1" | "q2" | "q3"
  ): useSubjectResponseTeacherHours => {
    if (!teacher || quarter) {
      return {
        error: true,
        message: "No ha suministrado un profesor",
        data: null,
      };
    }

    const totalHours = teacher.partTime;
    const asignedSubjects = subjectList.filter((subject) => subject.quarter[quarter] === teacher.id);
    const usedHours = asignedSubjects.reduce((acc, subject) => {
      return acc + subject.hours;
    }, 0);

    return {
      error: false,
      message: "Se ha calculado correctamente la carga horaria del profesor",
      data: {
        totalHours: totalHours.toString(),
        usedHours: usedHours.toString(),
        aviableHours: (totalHours - usedHours).toString(),
      },
    };
  };

  return { addSubjectToTeacher, removeSubjectFromTeacher, getTeacherHoursData };
}

