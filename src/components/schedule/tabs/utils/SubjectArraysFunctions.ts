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
