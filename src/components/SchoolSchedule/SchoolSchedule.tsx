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
import { Select } from 'antd';
import { generateScheduleEvents, mergeConsecutiveEvents, turnos, Classroom, Event } from './fucntions';



const SchoolSchedule: React.FC = () => {

  const { subjects, teachers, trayectosList} = useContext(MainContext) as MainContextValues;
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [eventData, setEventData] = useState<Event[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [turn, setTurn] = useState('mañana');
  const [seccion, setSeccion] = useState('1');
  const [pnf, setPnf] = useState('');
  const [trayectoId, setTrayectoId] = useState('');

  const firstHour = turnos?.[turn]?.[0]?.[0] ?? "07:00";
  const lastHour = turnos?.[turn]?.[turnos?.[turn]?.length - 1]?.[1] ?? "17:30";


  const loadInitialData = async (): Promise<void> => {
    const classroomsData = await getClassrooms();
    if (classroomsData.error) {
      console.error(classroomsData.message);
      return;
    }
    setClassrooms(classroomsData);
  }

  useEffect(() => {
    loadInitialData();
  }, [])

  useEffect(() => {
    if (!classrooms || classrooms.length === 0 || !subjects || subjects.length === 0) return;

    const restrictions = [
      {
        teacherId: "86d72bb0-9a93-4c15-ab26-220977a909d3",
        days: [1, 3]
      },
      {
        teacherId: "ce7d1039-7656-41ae-ae55-b14d315303ac",
        days: [1, 3]
      }
    ]

    const classroomRestrictions = [
      {
        subjectId: "66c36779-98ee-48d2-8653-590026606ffb",
        classroomIds: ["986d550a-e81b-4baf-96a6-ef2898dd2492", "0df11e0c-9a7d-47c7-8070-ea39586158e5", "7945c41b-88b1-4cdc-8b3a-430888017a01"]
      },
      {
        subjectId: "f5171975-35be-4511-9ac8-0763721105a4",
        classroomIds: ["4b8c9d1a-6e5f-4a3b-8c2d-1e0f9b4a7c6d"],

      }
    ]

    const eventsdata = generateScheduleEvents({
      subjects: subjects as Subject[],
      classrooms: classrooms,
      trimestre: 'q1',
      preferredClassrooms: classroomRestrictions,
      unavailableDays: restrictions
    });

    setEventData(eventsdata);
  }, [classrooms, subjects]);


  useEffect(() => {
    if (!eventData || eventData.length === 0) return;
    const filteredByPnf = eventData.filter((event) => event.extendedProps.pnfId === pnf && event.extendedProps.seccion === seccion && event.extendedProps.trayectoId === trayectoId && event.extendedProps.turnName.toLowerCase() === turn);
    setEvents(mergeConsecutiveEvents(filteredByPnf));
  }, [eventData, turn, seccion, pnf, trayectoId]);


  return <div style={{ height: '100%', width: '100%' }}>
    <div className='schedule-select'>
      <span>Turno:</span>
      <Select
        defaultValue={Object.keys(turnos)[0]}
        style={{ width: 120 }}
        onChange={setTurn}
        options={Object.keys(turnos).map((turn) => ({ value: turn, label: turn }))}
      />
    </div>

    <div className='schedule-select'>
      <span>Sección:</span>
      <Select
        defaultValue={eventData[0]?.extendedProps?.seccion}
        style={{ width: 120 }}
        onChange={setSeccion}
        options={Array.from(
          new Set(eventData.map(event => event?.extendedProps?.seccion))
        )
          .filter(Boolean)
          .map(seccion => ({
            value: seccion,
            label: `Sección ${seccion}`
          }))}
      />
    </div>

    <div className='schedule-select'>
      <span>PNF:</span>
      <Select
        value={pnf}
        style={{ width: 120 }}
        onChange={setPnf}
        options={Array.from(
          new Map(
            eventData
              .filter(event => event?.extendedProps?.pnfId && event?.extendedProps?.pnfName)
              .map(event => [
                event.extendedProps.pnfId,
                event.extendedProps.pnfName
              ])
          )
        ).map(([value, label]) => ({
          value,
          label
        }))}
      />
    </div>

    <div className='schedule-select'>
      <span>Trayecto:</span>
      <Select
        value={trayectoId}
        style={{ width: 120 }}
        onChange={setTrayectoId}
        options={trayectosList?.map((trayecto) => ({
          value: trayecto.id,
          label: trayecto.name
        }))}
      />
    </div>


    <div style={{ height: '100%', width: '100%', maxWidth: '1200px', maxHeight: '700px', margin: '0 auto' }}>
      <div className="calendar-container">
        <FullCalendar
          key={turn}
          plugins={[timeGridPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          weekends={false}
          slotMinTime={firstHour}
          slotMaxTime={lastHour}
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
          eventContent={(arg) => {
            const { event } = arg;
            const title = event.title;
            const professorId = event.extendedProps?.professorId;
            const classroomName = event.extendedProps?.classroomName;
            const teacherName = `${teachers?.find((teacher) => teacher.id === professorId)?.lastName} ${teachers?.find((teacher) => teacher.id === professorId)?.name}`;
            return (
              <div className="fc-event-custom">
                <div><strong>{title}</strong></div>
                <div style={{ fontSize: '0.75em', color: '#555' }}>
                  Profesor: {teacherName}
                </div>
                <div style={{ fontSize: '0.75em', color: '#777' }}>
                  {classroomName}
                </div>
              </div>
            );
          }}
        />

      </div>
    </div>

  </div>

};

export default SchoolSchedule;

