
import { Subject} from "../../interfaces/subject";

export interface Classroom {
  id: string;
  classroom: string;
}

export interface Event {
  title: string;
  daysOfWeek: number[]; // 1 = lunes, ..., 5 = viernes
  startTime: string;
  endTime: string;
  extendedProps: {
    subjectId: string;
    professorId: string | null;
    classroomId: string;
    classroomName: string;
    pnfId: string;
    trayectoId: string;
    seccion: string;
    pnfName: string;
    turnName: string;
    blockId: string;
  };
}

export interface generateScheduleParams {
  subjects: Subject[];
  classrooms: Classroom[];
  trimestre: 'q1' | 'q2' | 'q3';
  unavailableDays?: { teacherId: string; days: number[] }[];
  preferredClassrooms?: { subjectId: string; classroomIds: string[], preferLastSlot?: boolean; }[]
  existingEvents?: Event[]
  conserveSlots?: number
}




export const turnos: Record<string, [string, string][]> = {
  mañana: [
    ['07:00', '07:45'],
    ['07:45', '08:30'],
    ['08:30', '09:15'],
    ['09:15', '10:00'],
    ['10:00', '10:45'],
    ['10:45', '11:30'],
    ['11:30', '12:15'],
  ],
  tarde: [
    ['12:15', '13:00'],
    ['13:00', '13:45'],
    ['13:45', '14:30'],
    ['14:30', '15:15'],
    ['15:15', '16:00'],
    ['16:00', '16:45'],
    ['16:45', '17:30'],
  ],
  noche: [
    ['17:30', '18:15'],
    ['18:15', '19:00'],
    ['19:00', '19:45'],
    ['19:45', '20:30'],
    ['20:30', '21:15'],
  ],
  diurno: [
    ['07:00', '07:45'],
    ['07:45', '08:30'],
    ['08:30', '09:15'],
    ['09:15', '10:00'],
    ['10:00', '10:45'],
    ['10:45', '11:30'],
    ['11:30', '12:15'],
    ['12:15', '13:00'],
    ['13:00', '13:45'],
    ['13:45', '14:30'],
    ['14:30', '15:15'],
    ['15:15', '16:00'],
    ['16:00', '16:45'],
    ['16:45', '17:30'],
  ]
};


export function generateScheduleEvents({
  subjects,
  classrooms,
  trimestre,
  unavailableDays,
  existingEvents,
  preferredClassrooms,
  conserveSlots = 3
}: generateScheduleParams): Event[] {
  const events: Event[] = [];
  const days = [1, 2, 3, 4, 5];

  const globalUsedSlots = new Set<string>();
  const sectionUsedSlots = new Set<string>();

  // Precargar conflictos existentes
  if (existingEvents?.length) {
    for (const event of existingEvents) {
      const day = event.daysOfWeek[0];
      const start = event.startTime;
      const { professorId, classroomId, trayectoId, seccion, pnfId } = event.extendedProps;

      if (professorId) {
        globalUsedSlots.add(`${day}-${start}-${professorId}`);
      }
      globalUsedSlots.add(`${day}-${start}-${trayectoId}-${classroomId}`);
      sectionUsedSlots.add(`${day}-${start}-${pnfId}-${trayectoId}-${seccion}`);
    }
  }

  // Fase 1: profesores con restricciones
  const withRestrictions = subjects.filter(subject =>
    unavailableDays?.some(r => r.teacherId === subject.quarter[trimestre])
  );

  // Fase 2: profesores sin restricciones
  const withoutRestrictions = subjects.filter(subject =>
    !unavailableDays?.some(r => r.teacherId === subject.quarter[trimestre])
  );

  // Fase 3: materias no asignadas
  const unassignedSubjects: Subject[] = [];

  const assignSubject = (subject: Subject, ignoreRestrictions = false): boolean => {
    const hours = subject.hours[trimestre];
    const professorId = subject.quarter[trimestre];
    const turno = subject.turnoName?.toLowerCase();
    const preferConfig = preferredClassrooms?.find(p => p.subjectId === subject.id);
    const timeSlots = preferConfig?.preferLastSlot
      ? [...turnos[turno]].reverse()
      : turnos[turno];

    if (!hours || !professorId || !timeSlots) return false;

    let remainingHours = hours;

    const restrictedDays = unavailableDays?.find(r => r.teacherId === professorId)?.days ?? [];
    const availableDays = ignoreRestrictions ? days : days.filter(day => !restrictedDays.includes(day));

    for (const day of availableDays) {
      if (remainingHours <= 0) break;

      let blocksAssigned = 0;

      for (let i = 0; i < timeSlots.length && blocksAssigned < conserveSlots && remainingHours > 0; i++) {
        const [start, end] = timeSlots[i];

        const candidateClassrooms = preferConfig?.classroomIds?.length
          ? classrooms.filter(c => preferConfig.classroomIds.includes(c.id))
          : classrooms;

        let assigned = false;

        for (const classroom of candidateClassrooms) {
          const conflictKeyProf = `${day}-${start}-${professorId}`;
          const conflictKeyRoom = `${day}-${start}-${subject.trayectoId}-${classroom.id}`;
          const conflictKeySection = `${day}-${start}-${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`;

          if (
            globalUsedSlots.has(conflictKeyProf) ||
            globalUsedSlots.has(conflictKeyRoom) ||
            sectionUsedSlots.has(conflictKeySection)
          ) continue;

          const blockId = `${day}-${subject.innerId}`;

          events.push({
            title: subject.subject,
            daysOfWeek: [day],
            startTime: start,
            endTime: end,
            extendedProps: {
              subjectId: subject.innerId,
              professorId,
              classroomId: classroom.id,
              classroomName: classroom.classroom,
              pnfId: subject.pnfId,
              trayectoId: subject.trayectoId,
              seccion: subject.seccion,
              pnfName: subject.pnf,
              turnName: subject.turnoName,
              blockId,
            },
          });

          globalUsedSlots.add(conflictKeyProf);
          globalUsedSlots.add(conflictKeyRoom);
          sectionUsedSlots.add(conflictKeySection);
          blocksAssigned++;
          remainingHours--;
          assigned = true;
          break;
        }

        if (!assigned) continue;
      }
    }

    return remainingHours === 0;
  };

  // Ejecutar fases
  for (const subject of withRestrictions) {
    const success = assignSubject(subject, false);
    if (!success) unassignedSubjects.push(subject);
  }

  for (const subject of withoutRestrictions) {
    const success = assignSubject(subject, false);
    if (!success) unassignedSubjects.push(subject);
  }

  for (const subject of unassignedSubjects) {
    assignSubject(subject, true); // Ignorar restricciones como último recurso
  }

  return events;
}


export function mergeConsecutiveEvents(events: Event[]): Event[] {
  const merged: Event[] = [];

  // Agrupar por blockId
  const grouped = new Map<string, Event[]>();
  for (const event of events) {
    const key = event.extendedProps.blockId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  for (const group of grouped.values()) {
    const sorted = group.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let i = 0;
    while (i < sorted.length) {
      const current = { ...sorted[i] };
      let j = i + 1;

      while (
        j < sorted.length &&
        sorted[j].startTime === current.endTime
      ) {
        current.endTime = sorted[j].endTime;
        j++;
      }

      merged.push(current);
      i = j;
    }
  }

  return merged;
}

