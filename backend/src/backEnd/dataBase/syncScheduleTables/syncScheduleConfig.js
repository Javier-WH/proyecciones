import ScheduleConfig from '#models/schedule/scheduleConfig.js'

export default async function syncScheduleConfig() {
    try {
        const config = await ScheduleConfig.findOne()
        if (config) return

        const defaultTurnos = {
            mañana: [
                ['07:00', '07:45'],
                ['07:45', '08:30'],
                ['08:30', '09:15'],
                ['09:15', '10:00'],
                ['10:00', '10:45'],
                ['10:45', '11:30']
            ],
            tarde: [
                ['12:15', '13:00'],
                ['13:00', '13:45'],
                ['13:45', '14:30'],
                ['14:30', '15:15'],
                ['15:15', '16:00'],
                ['16:00', '16:45']
            ],
            nocturno: [
                ['16:00', '16:45'],
                ['16:45', '17:30'],
                ['17:30', '18:15'],
                ['18:15', '19:00'],
                ['19:00', '19:45'],
                ['19:45', '20:30']
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
                ['16:00', '16:45']
            ]
        }

        await ScheduleConfig.create({
            days: [1, 2, 3, 4, 5],
            turnos: defaultTurnos,
            conserve_slots: 3,
            min_consecutive_slots: 2,
            active: true
        })
        console.log('Configuración de horarios inicial creada.')
    } catch (error) {
        console.error('Error syncing ScheduleConfig:', error)
    }
}
