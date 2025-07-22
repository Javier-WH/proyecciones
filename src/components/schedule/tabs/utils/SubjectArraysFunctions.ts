import { InlineHours, Subject } from "../../../../interfaces/subject";

interface GroupedSubjects {
  [pnf: string]: {
    [seccion: string]: Subject[];
  };
}
//separa las materias por horas individuales
export function splitSubjectsByQuarter(subjects: Subject[], quarter: keyof InlineHours): Subject[] {
  const result: Subject[] = [];

  for (const subject of subjects) {
    // Obtener la cantidad de horas para el trimestre especificado
    const hoursCount = subject.hours[quarter] || 0;

    // Si no hay horas para este trimestre, saltar esta materia
    if (hoursCount <= 0) continue;

    // Crear n copias de la materia, una por cada hora
    for (let i = 1; i <= hoursCount; i++) {
      const clonedSubject: Subject = {
        ...subject,
        innerId: `${subject.innerId}-${quarter}-${i}`,
        hours: {
          ...subject.hours,
          [quarter]: 1, // Cada copia representa 1 hora
        },
      };

      // Actualizar la clave si existe
      if (clonedSubject.key) {
        clonedSubject.key = `${clonedSubject.key}-${quarter}-${i}`;
      }

      result.push(clonedSubject);
    }
  }

  return result;
}

//agrupa las materias por pnf y seccion
export function groupSubjectsByPnfAndSeccion(subjects: Subject[]): GroupedSubjects {
  const grouped: GroupedSubjects = {};

  for (const subject of subjects) {
    const { pnf, seccion } = subject;

    // Crear grupo para el PNF si no existe
    if (!grouped[pnf]) {
      grouped[pnf] = {};
    }

    // Crear grupo para la sección si no existe
    if (!grouped[pnf][seccion]) {
      grouped[pnf][seccion] = [];
    }

    // Agregar asignatura al grupo
    grouped[pnf][seccion].push(subject);
  }

  return grouped;
}

//reordena el array de materias para que no queden mas horas consecutivas de las deseadas
export function rearrangeSubjectsForSchedule(scheduleArray: Subject[], limit: number): Subject[] {
  if (!Array.isArray(scheduleArray)) {
    console.error("The input must be an array.");
    return [];
  }

  const rearrangedSchedule = [];
  const subjectsToMoveToEnd = [];

  // Helper to determine if two subject entries are for the "same" class
  // We'll use id, pnfId, seccion, and turnoName as the unique identifiers.
  const areSameClass = (subject1: Subject, subject2: Subject) => {
    if (!subject1 || !subject2) return false; // Handle potential undefined/null
    return (
      subject1.id === subject2.id /*&&
      subject1.pnfId === subject2.pnfId &&
      subject1.seccion === subject2.seccion &&
      subject1.turnoName === subject2.turnoName*/
    );
  };

  let i = 0;
  while (i < scheduleArray.length) {
    let currentSubject = scheduleArray[i];
    let consecutiveCount = 0;
    let j = i;
    let consecutiveBlock = [];

    // Count consecutive occurrences of the current subject group
    // and collect them into a temporary block
    while (j < scheduleArray.length && areSameClass(currentSubject, scheduleArray[j])) {
      consecutiveCount++;
      consecutiveBlock.push(scheduleArray[j]);
      j++;
    }

    // Check if the consecutive block exceeds 3 hours
    if (consecutiveCount > limit) {
      // If it exceeds, add this entire block to the 'subjectsToMoveToEnd' array
      subjectsToMoveToEnd.push(...consecutiveBlock);
    } else {
      // Otherwise, add it to the 'rearrangedSchedule'
      rearrangedSchedule.push(...consecutiveBlock);
    }

    // Move the main index 'i' to the beginning of the next distinct subject block
    i = j;
  }

  // Concatenate the two arrays: well-behaved subjects first, then the problematic ones
  return rearrangedSchedule.concat(subjectsToMoveToEnd);
}

