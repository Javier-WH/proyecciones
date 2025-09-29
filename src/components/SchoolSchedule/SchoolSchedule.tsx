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
    if (!classrooms || !subjects) return;
    const eventsdata = generateScheduleEvents(subjects as Subject[], classrooms, 'q1'); 
    console.log(eventsdata);
    const filteredByPnf = eventsdata.filter((event) => event.extendedProps.pnfId === 'bd6ebd71-c81a-4cae-bf00-b129fd680636');
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
        slotMinTime="07:00:00"
        slotMaxTime="13:00:00"
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
  };
}

const timeSlots = [
  ['07:00', '07:45'],
  ['07:45', '08:30'],
  ['08:30', '09:15'],
  ['09:15', '10:00'],
  ['10:00', '10:45'],
  ['10:45', '11:30'],
  ['11:30', '12:15'],
  ['12:15', '13:00'],
];

function generateScheduleEvents(subjects: Subject[], classrooms: Classroom[], trimestre: 'q1' | 'q2' | 'q3'): Event[] {
  const events: Event[] = [];
  const usedSlots: Record<string, Set<string>> = {}; // key: day-trayectoId, value: time-professorId/classroomId

  const days = [1, 2, 3, 4, 5]; // lunes a viernes
  const classroomIndex = 0;

  for (const subject of subjects) {
    const hours = subject.hours[trimestre];
    const professorId = subject.quarter[trimestre];
    if (!hours || !professorId) continue;

    let remainingHours = hours;
    let dayIndex = 0;

    while (remainingHours > 0 && dayIndex < days.length) {
      const day = days[dayIndex];
      const trayectoKey = `${day}-${subject.trayectoId}`;
      if (!usedSlots[trayectoKey]) usedSlots[trayectoKey] = new Set();

      let blocksAssigned = 0;
      for (let i = 0; i < timeSlots.length && blocksAssigned < 3 && remainingHours > 0; i++) {
        const [start, end] = timeSlots[i];
        const slotKeyProf = `${start}-${professorId}`;
        const slotKeyRoom = `${start}-${classroomIndex}`;

        if (
          usedSlots[trayectoKey].has(slotKeyProf) ||
          usedSlots[trayectoKey].has(slotKeyRoom)
        ) continue;

        // asignar evento
        const classroom = classrooms[classroomIndex % classrooms.length];
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
            pnfName: subject.pnf
          },
        });

        usedSlots[trayectoKey].add(slotKeyProf);
        usedSlots[trayectoKey].add(slotKeyRoom);
        blocksAssigned++;
        remainingHours--;
      }

      dayIndex++;
    }
  }

  return events;
}


export function mergeConsecutiveEvents(events: Event[]): Event[] {
  const merged: Event[] = [];

  // Agrupar por día
  const grouped = new Map<number, Event[]>();
  for (const event of events) {
    const day = event.daysOfWeek[0];
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(event);
  }

  for (const [day, dayEvents] of grouped.entries()) {
    // Ordenar por hora de inicio
    const sorted = dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let i = 0;
    while (i < sorted.length) {
      const current = sorted[i];
      let j = i + 1;

      while (
        j < sorted.length &&
        sorted[j].startTime === current.endTime &&
        sorted[j].title === current.title &&
        JSON.stringify(sorted[j].extendedProps) === JSON.stringify(current.extendedProps)
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