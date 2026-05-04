// =====================================================
// Turnos predefinidos — mirror of fucntions.tsx
// =====================================================
// "diurno" is intentionally NOT hardcoded: it is the union of mañana + tarde,
// generated at the call site. Keep this identical to the frontend map.

/** @typedef {[string, string]} TimeSlot */

/** @type {Record<string, TimeSlot[]>} */
export const turnos = {
  mañana: [
    ['07:00', '07:45'],
    ['07:45', '08:30'],
    ['08:40', '09:25'],
    ['09:25', '10:10'],
    ['10:14', '11:00'],
    ['11:00', '11:45']
  ],
  tarde: [
    ['13:00', '13:45'],
    ['13:45', '14:30'],
    ['14:30', '15:15'],
    ['15:15', '16:00'],
    ['16:00', '16:45'],
    ['16:45', '17:30']
  ],
  nocturno: [
    ['16:00', '16:45'],
    ['16:45', '17:30'],
    ['17:30', '18:15'],
    ['18:15', '19:00'],
    ['19:00', '19:45'],
    ['19:45', '20:30']
  ]
}

/** Hard cap on backtracks, mirrors the frontend constant. */
export const MAX_BACKTRACKS = 20000
