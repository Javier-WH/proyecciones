// Minimal smoke tests for the ported engine.
// Run with: node --test backend/src/backEnd/schedule/engine/__tests__
// These do NOT constitute parity tests (see progress.md / plan §3.
// Golden fixtures captured from the live frontend are still pending).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  generateScheduleEvents,
  mergeConsecutiveEvents,
  normalizeText,
  OccupancyTracker,
  periodsOverlap,
  getSubjectPeriod
} from '../index.js'

test('normalizeText strips diacritics and spaces', () => {
  assert.equal(normalizeText('Formación Crítica II'), 'formacioncriticaii')
  assert.equal(normalizeText(null), '')
  assert.equal(normalizeText(''), '')
})

test('OccupancyTracker tracks professor/room/section independently', () => {
  const o = new OccupancyTracker()
  o.occupy(1, '08:00', 'prof1', 'room1', 'pnf1', 'tray1', 'A', 'sub1')
  assert.equal(o.hasProfConflict(1, '08:00', 'prof1'), true)
  assert.equal(o.hasRoomConflict(1, '08:00', 'room1'), true)
  assert.equal(o.hasSectionConflict(1, '08:00', 'pnf1', 'tray1', 'A'), true)
  assert.equal(o.getSubjectDayHours('sub1', 1), 1)
  assert.deepEqual(o.getSubjectDayStartTimes('sub1', 1), ['08:00'])

  o.release(1, '08:00', 'prof1', 'room1', 'pnf1', 'tray1', 'A', 'sub1')
  assert.equal(o.hasProfConflict(1, '08:00', 'prof1'), false)
  assert.equal(o.getSubjectDayHours('sub1', 1), 0)
})

test('OccupancyTracker ghost variant does not mark section', () => {
  const o = new OccupancyTracker()
  o.occupyGhost(1, '08:00', 'prof1', 'room1')
  assert.equal(o.hasProfConflict(1, '08:00', 'prof1'), true)
  assert.equal(o.hasRoomConflict(1, '08:00', 'room1'), true)
  assert.equal(o.hasSectionConflict(1, '08:00', 'pnf1', 'tray1', 'A'), false)
})

test('periodsOverlap: two semestrals never overlap; T1↔S1 overlaps', () => {
  const s1 = getSubjectPeriod(true, 'q1') // S1: {T1, T2}
  const s2 = getSubjectPeriod(true, 'q2') // S2: {T2, T3}
  const t1 = getSubjectPeriod(false, 'q1') // {T1}
  const t2 = getSubjectPeriod(false, 'q2') // {T2}
  const t3 = getSubjectPeriod(false, 'q3') // {T3}

  assert.equal(periodsOverlap(s1, s2, true, true), false, 'two semestrals never conflict')
  assert.equal(periodsOverlap(t1, t2, false, false), false, 'T1 and T2 do not overlap')
  assert.equal(periodsOverlap(t1, s1, false, true), true, 'T1 and S1 overlap')
  assert.equal(periodsOverlap(t3, s1, false, true), false, 'T3 and S1 do not overlap')
  assert.equal(periodsOverlap(t2, s1, false, true), true)
  assert.equal(periodsOverlap(t2, s2, false, true), true)
})

test('generateScheduleEvents: empty inputs produce no events', () => {
  const events = generateScheduleEvents({
    subjects: [],
    classrooms: [],
    trimestre: 'q1'
  })
  assert.deepEqual(events, [])
})

test('generateScheduleEvents: single subject, one room, one day', () => {
  const errs = []
  const events = generateScheduleEvents({
    subjects: [{
      innerId: 'sub1',
      subject: 'Matemática',
      seccion: 'A',
      pnfId: 'pnf1',
      pnf: 'Informática',
      trayectoId: 'tr1',
      trayectoName: 'I',
      turnoName: 'mañana',
      isSemestral: false,
      hours: { q1: 2, q2: 0, q3: 0 },
      quarter: { q1: 'prof1', q2: null, q3: null }
    }],
    classrooms: [{ id: 'room1', classroom: 'Aula 1', active: true, exclusive: false }],
    trimestre: 'q1',
    customDays: [1],
    setErrors: (e) => errs.push(e),
    teachers: [{ id: 'prof1', name: 'Pro', lastName: 'Fe' }]
  })
  assert.equal(errs.length, 0, 'should not error')
  assert.equal(events.length, 2, 'should place 2 hours')
  assert.equal(events[0].extendedProps.classroomId, 'room1')
  assert.equal(events[0].daysOfWeek[0], 1)
})

test('mergeConsecutiveEvents collapses adjacent slots with same blockId', () => {
  const base = (start, end) => ({
    title: 't',
    daysOfWeek: [1],
    startTime: start,
    endTime: end,
    extendedProps: {
      subjectId: 's1',
      professorId: 'p1',
      classroomId: 'r1',
      classroomName: 'R',
      pnfId: 'pnf',
      trayectoId: 't',
      seccion: 'A',
      pnfName: '',
      turnName: 'mañana',
      blockId: '1-s1'
    }
  })
  const merged = mergeConsecutiveEvents([
    base('07:00', '07:45'),
    base('07:45', '08:30'),
    base('09:00', '09:45') // gap → different block
  ])
  assert.equal(merged.length, 2)
  assert.equal(merged[0].startTime, '07:00')
  assert.equal(merged[0].endTime, '08:30')
  assert.equal(merged[1].startTime, '09:00')
})
