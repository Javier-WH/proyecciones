import React, { useState, useContext, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';
import { EventInput } from '@fullcalendar/core';
import { MainContext } from '../../context/mainContext';
import { MainContextValues } from '../../interfaces/contextInterfaces';
import { Subject } from "../../interfaces/subject";
import './SchoolSchedule.css'; 
import { getClassrooms } from '../../fetch/schedule/scheduleFetch';

export interface Classroom {
  id: string;
  classroom: string;
}

const SchoolSchedule: React.FC = () => {

  const { subjects } = useContext(MainContext) as MainContextValues;
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  const [events, setEvents] = useState<EventInput[]>([
    {
      title: 'Matemáticas',
      daysOfWeek: [1],
      startTime: '07:00',
      endTime: '08:30',
      startRecur: '2025-09-29',
      endRecur: '2025-10-03',
    },
    {
      title: 'Historia',
      daysOfWeek: [2],
      startTime: '10:00',
      endTime: '11:30',
      startRecur: '2025-09-29',
      endRecur: '2025-10-03',
    },
    {
      title: 'Química',
      daysOfWeek: [3],
      startTime: '08:30',
      endTime: '10:45',
      startRecur: '2025-09-29',
      endRecur: '2025-10-03',
    },
  ]);
  const loadInitialData = async (): Promise<void> => {
    const classroomsData = await getClassrooms();
    if (classroomsData.error) {
      console.error(classroomsData.message);
      return;
    }
    setClassrooms(classroomsData);
  }
  useEffect(()=>{
    loadInitialData();
  },[])

  useEffect(() => {
    if (!classrooms || classrooms.length === 0 || !subjects || subjects.length === 0) return;
    const eventsdata = generateScheduleEvents(subjects as Subject[], classrooms, 'q1'); 
    console.log(eventsdata);
    const filteredByPnf = eventsdata.filter((event) => event.extendedProps.pnfId === 'bd6ebd71-c81a-4cae-bf00-b129fd680636' && event.extendedProps.seccion === '3' && event.extendedProps.trayectoId === '16817025-cd37-41e7-8d2b-5db381c7a725' && event.extendedProps.turnName.toLowerCase() === 'tarde');
    //console.log(filteredByPnf);
    setEvents(mergeConsecutiveEvents(filteredByPnf));
  }, [classrooms, subjects]);

  //console.log(generateScheduleEvents(subjects as Subject[], classrooms, 'q1'));
 


  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[timeGridPlugin]}
        initialView="timeGridWeek"
        locale={esLocale}
        weekends={false}
        slotMinTime="13:00:00"
        slotMaxTime="21:00:00"
        slotDuration="00:45:00"
        slotLabelContent={(arg) => {
          const start = arg.date;
          const end = new Date(start.getTime() + 45 * 60000);
          const formatTime = (date: Date) =>
            date.toLocaleTimeString('es-VE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          return `${formatTime(start)} - ${formatTime(end)}`;
        }}
        dayHeaderFormat={{ weekday: 'long' }}
        allDaySlot={false}
        headerToolbar={{ left: '', center: '', right: '' }}
        events={events}
        height="100%"
        expandRows={true}
        contentHeight={1400}
      />


    </div>
  );
};

export default SchoolSchedule;



interface Event {
  title: string;
  daysOfWeek: number[]; // 1 = lunes, ..., 5 = viernes
  startTime: string;
  endTime: string;
  extendedProps: {
    subjectId: string;
    professorId: string | null;
    classroomId: string;
    pnfId: string;
    trayectoId: string;
    seccion: string;
    pnfName: string;
    turnName: string;
    blockId: string;
  };
}


function generateScheduleEvents(
  subjects: Subject[],
  classrooms: Classroom[],
  trimestre: 'q1' | 'q2' | 'q3',
  unavailableDays?: { teacherId: string; days: number[] }[]
): Event[] {
  const events: Event[] = [];

  const turnos: Record<string, [string, string][]> = {
    mañana: [
      ['07:00', '07:45'],
      ['07:45', '08:30'],
      ['08:30', '09:15'],
      ['09:15', '10:00'],
      ['10:00', '10:45'],
      ['10:45', '11:30'],
      ['11:30', '12:15'],
      ['12:15', '13:00'],
    ],
    tarde: [
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
  };

  const days = [1, 2, 3, 4, 5]; // lunes a viernes

  // Conflictos globales
  const globalUsedSlots = new Set<string>(); // profesor y aula
  const sectionUsedSlots = new Set<string>(); // sección

  for (const subject of subjects) {
    const hours = subject.hours[trimestre];
    const professorId = subject.quarter[trimestre];
    const turno = subject.turnoName?.toLowerCase();
    const timeSlots = turnos[turno];

    if (!hours || !professorId || !timeSlots) continue;

    let remainingHours = hours;

    // 🔒 Filtrar días prohibidos para este profesor
    const restrictedDays = unavailableDays?.find(r => r.teacherId === professorId)?.days ?? [];
    const availableDays = days.filter(day => !restrictedDays.includes(day));

    for (const day of availableDays) {
      if (remainingHours <= 0) break;

      let blocksAssigned = 0;

      for (let i = 0; i < timeSlots.length && blocksAssigned < 3 && remainingHours > 0; i++) {
        const [start, end] = timeSlots[i];
        const classroom = classrooms[(events.length + i) % classrooms.length];

        const conflictKeyProf = `${day}-${start}-${subject.trayectoId}-${professorId}`;
        const conflictKeyRoom = `${day}-${start}-${subject.trayectoId}-${classroom.id}`;
        const conflictKeySection = `${day}-${start}-${subject.trayectoId}-${subject.seccion}`;

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
      }
    }
  }

  return events;
}





function mergeConsecutiveEvents(events: Event[]): Event[] {
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

