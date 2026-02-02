import Days from '#models/schedule/days.js'
import Classrooms from '#models/schedule/classrooms.js'
import Hours from '#models/schedule/hours.js'
import syncScheduleConfig from './syncScheduleConfig.js'

async function syncDaysTable() {
  try {
    const days = await Days.findAll({ raw: true })
    if (days.length === 0) {
      const initialDays = [
        { day: 'Lunes', index: 1 },
        { day: 'Martes', index: 2 },
        { day: 'Miércoles', index: 3 },
        { day: 'Jueves', index: 4 },
        { day: 'Viernes', index: 5 },
        { day: 'Sábado', index: 6 },
        { day: 'Domingo', index: 7 }
      ]
      await Days.bulkCreate(initialDays)
      console.log('Días iniciales agregados a la tabla Days.')
    }
  } catch (error) {
    console.error('Error syncing Days tables:', error)
  }
}

async function syncClassroomsTable() {
  try {
    const classrooms = await Classrooms.findAll({ raw: true })
    if (classrooms.length === 0) {
      const initialClassrooms = [
        { classroom: 'Aula 1' },
        { classroom: 'Aula 2' },
        { classroom: 'Aula 3' },
        { classroom: 'Aula 4' },
        { classroom: 'Aula 5' },
        { classroom: 'Aula 6' },
        { classroom: 'Aula 7' },
        { classroom: 'Aula 8' },
        { classroom: 'Aula 9' },
        { classroom: 'Aula 10' },
        { classroom: 'Aula 11' },
        { classroom: 'Aula 12' },
        { classroom: 'Aula 13' },
        { classroom: 'Aula 14' },
        { classroom: 'Laboratorio Informática 1' },
        { classroom: 'Laboratorio Informática 2' },
        { classroom: 'Laboratorio Informática 3' }
      ]
      await Classrooms.bulkCreate(initialClassrooms)
      console.log('Aulas iniciales agregadas a la tabla Classrooms.')
    }
  } catch (error) {
    console.error('Error syncing Classrooms tables:', error)
  }
}

async function syncHoursTable() {
  try {
    const stepMinutes = 45 // Duración de cada franja horaria en minutos
    const initialStartTime = '07:00' // Hora de inicio de la primera franja
    const totalSlots = 24 // Número total de franjas horarias a generar

    const hoursInDb = await Hours.findAll({ raw: true })

    if (hoursInDb.length === 0) {
      const generatedHours = []
      let currentIndex = 1

      // Parsear la hora de inicio inicial
      const [startHour, startMinute] = initialStartTime.split(':').map(Number)
      const currentTime = new Date()
      currentTime.setHours(startHour, startMinute, 0, 0) // Establecer la hora inicial sin afectar la fecha

      for (let i = 0; i < totalSlots; i++) {
        const startTime = new Date(currentTime) // Clonar para la hora de inicio de la franja actual

        // Calcular la hora de fin sumando stepMinutes
        currentTime.setMinutes(currentTime.getMinutes() + stepMinutes)
        const endTime = new Date(currentTime) // Clonar para la hora de fin de la franja actual

        const hoursString = `${formatTime(startTime)} - ${formatTime(endTime)}`

        generatedHours.push({
          index: currentIndex++,
          hours: hoursString
        })
      }

      await Hours.bulkCreate(generatedHours)
      console.log('Horas generadas y agregadas a la tabla Hours')
      return true
    }
  } catch (error) {
    console.error('Error sincronizando la tabla Hours:', error)
    return false
  }
}

// Función para convertir tiempo en minutos
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Función para formatear minutos a HH:mm
/* const formatTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
} */

/**
 * Formatea un objeto Date para obtener la hora en formato HH:MM.
 * Esta función funcionará correctamente en Windows y Linux.
 * @param {Date} dateObj El objeto Date a formatear.
 * @returns {string} La hora formateada (ej: "07:00").
 */
const formatTime = (dateObj) => {
  // Aseguramos que los números tengan 2 dígitos (ej: 7 -> 07)
  const pad = (num) => String(num).padStart(2, '0')

  // Obtenemos la hora y los minutos del objeto Date
  const hours = dateObj.getHours()
  const minutes = dateObj.getMinutes()

  return `${pad(hours)}:${pad(minutes)}`
}

export async function updateHoursTable(stepMinutes, initialStartTime, totalSlots) {
  try {
    // Validar parámetros
    if (typeof stepMinutes !== 'number' || stepMinutes <= 0) {
      console.error('stepMinutes debe ser un número positivo')
      return false
    }

    if (typeof initialStartTime !== 'string' || !/^\d{1,2}:\d{2}$/.test(initialStartTime)) {
      console.error('Formato de hora inicial inválido. Debe ser HH:mm')
      return false
    }

    // Obtener todos los registros ordenados por índice
    const existingHours = await Hours.findAll({
      raw: true,
      order: [['index', 'ASC']]
    })

    if (existingHours.length === 0) return

    // Convertir hora inicial a minutos
    const startMinutes = timeToMinutes(initialStartTime)

    // Limitar los slots al mínimo entre totalSlots y 24 registros
    const actualSlots = Math.min(totalSlots, existingHours.length)

    // Preparar las actualizaciones
    const updates = []
    let currentStart = startMinutes

    for (let i = 0; i < existingHours.length; i++) {
      const record = existingHours[i]
      let newHours = null

      if (i < actualSlots) {
        const endMinutes = currentStart + stepMinutes
        newHours = `${formatTime(currentStart)} - ${formatTime(endMinutes)}`
        currentStart = endMinutes
      }

      // Solo actualizar si el valor cambió
      if (record.hours !== newHours) {
        updates.push({
          id: record.id,
          hours: newHours
        })
      }
    }

    // Ejecutar actualizaciones en paralelo
    await Promise.all(
      updates.map((update) => Hours.update({ hours: update.hours }, { where: { id: update.id } }))
    )

    return true
  } catch (error) {
    console.error('Error updating hours table:', error)
    return false
  }
}

export default function syncSchedule() {
  syncDaysTable()
  syncClassroomsTable()
  syncHoursTable()
  syncScheduleConfig()
}
