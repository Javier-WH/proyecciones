import fethTrayectosAPI from '#fetch/fetchTrayectosAPI.js'
import Trayecto from '#models/trayecto.js'
export default async function sycnSagaTrayectos () {
  const sagaTrayectos = await fethTrayectosAPI()

  if (sagaTrayectos === null) {
    console.log('No se han podido sincronizar los programas')
    return
  }

  const trayectoList = sagaTrayectos.map(item => {
    return {
      id: crypto.randomUUID(),
      name: item.trayecto.trim(),
      saga_id: item.id,
      order: item.id
    }
  })

  try {
    await Trayecto.bulkCreate(trayectoList, {
      fields: ['id', 'name', 'saga_id', 'order'],
      updateOnDuplicate: ['name', 'saga_id']
    })
    console.log('Trayectos sincronizados')
  } catch (error) {
    console.log(error)
  }
}
