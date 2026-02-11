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
    if (subjectIndex === -1) {
      return { error: true, message: "Materia no encontrada", data: null };
    }

    const targetSubject = subjectList[subjectIndex];
    const linkKey = `${targetSubject.seccion} - ${targetSubject.turnoName}`;

    // Find all subjects to update: the target one + any linked ones (same subject in child sections)
    const indexesToUpdate = [subjectIndex];

    subjectList.forEach((s, index) => {
      if (index !== subjectIndex && s.linkedToSection === linkKey && s.pensum_id === targetSubject.pensum_id && s.trayectoId === targetSubject.trayectoId) {
        indexesToUpdate.push(index);
      }
    });

    indexesToUpdate.forEach(idx => {
      const currentSubject = subjectList[idx];
      const subjectQuarter = Object.keys(currentSubject.quarter) as Array<
        keyof (typeof currentSubject)["quarter"]
      >;
      for (let quarter of subjectQuarter) {
        currentSubject.quarter[quarter] = teacherId;
      }

      // Logic for Semestral: Ensure Q1 and Q2 are identical
      if (currentSubject.isSemestral) {
        // If we assigned to Q1 or Q2, ensure both are set
        if (currentSubject.quarter.q1 === teacherId || currentSubject.quarter.q2 === teacherId) {
          currentSubject.quarter.q1 = teacherId;
          currentSubject.quarter.q2 = teacherId;
        }
      }
    });

    return {
      error: false,
      message: "Se ha asignado la materia al profesor correctamente (incluyendo secciones vinculadas)",
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
    if (subjectIndex === -1) {
      return { error: true, message: "Materia no encontrada", data: null };
    }

    const targetSubject = subjectList[subjectIndex];
    const linkKey = `${targetSubject.seccion} - ${targetSubject.turnoName}`;

    // Find all subjects to update: the target one + any linked ones
    const indexesToUpdate = [subjectIndex];

    subjectList.forEach((s, index) => {
      if (index !== subjectIndex && s.linkedToSection === linkKey && s.pensum_id === targetSubject.pensum_id && s.trayectoId === targetSubject.trayectoId) {
        indexesToUpdate.push(index);
      }
    });

    indexesToUpdate.forEach(idx => {
      const currentSubject = subjectList[idx];
      // se obtienen los trimestres donde se da la materia
      const subjectQuarter = Object.keys(currentSubject.quarter) as Array<
        keyof (typeof currentSubject)["quarter"]
      >;
      // a cada trimestre que se de la materia se  elimina el profesor si es que da la materia
      for (let quarter of subjectQuarter) {
        if (currentSubject.quarter[quarter] === teacherId) {
          currentSubject.quarter[quarter] = null;
        }
      }

      // Logic for Semestral: Ensure Q1 and Q2 are cleared together
      if (currentSubject.isSemestral) {
        if (currentSubject.quarter.q1 === teacherId) currentSubject.quarter.q1 = null;
        if (currentSubject.quarter.q2 === teacherId) currentSubject.quarter.q2 = null;
      }
    });

    return {
      error: false,
      message: "Se ha removido la materia al profesor correctamente (incluyendo secciones vinculadas)",
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

