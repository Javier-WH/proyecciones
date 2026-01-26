import fetchTurnosAPI from '#fetch/fetchTurnosAPI.js'
import Turnos from '#models/turnos.js'
export default async function sycnSagaTurnos () {
  const sagaTurnos = await fetchTurnosAPI()

  if (sagaTurnos === null) {
    console.log('No se han podido sincronizar los turnos')
    return
  }

  const turnosList = sagaTurnos.map(item => {
    return {
      id: crypto.randomUUID(),
      name: item.turno.trim(),
      saga_id: item.id
    }
  })

  try {
    await Turnos.bulkCreate(turnosList, {
      fields: ['id', 'name', 'saga_id'],
      updateOnDuplicate: ['name', 'saga_id']
    })
    console.log('Turnos sincronizados')
  } catch (error) {
    console.log(error)
  }
}
