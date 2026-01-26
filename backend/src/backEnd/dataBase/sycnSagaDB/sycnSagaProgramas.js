import fethProgramasAPI from '#fetch/fetchProgramasAPI.js'
import Pnf from '#models/pnf.js'
export default async function sycnSagaProgramas () {
  const sagaProgramas = await fethProgramasAPI()

  if (sagaProgramas === null) {
    console.log('No se han podido sincronizar los programas')
    return
  }

  const programaList = sagaProgramas.map(item => {
    return {
      id: crypto.randomUUID(),
      name: item.programa.trim(),
      saga_id: item.id
    }
  })

  try {
    await Pnf.bulkCreate(programaList, {
      fields: ['id', 'name', 'saga_id'],
      updateOnDuplicate: ['name', 'saga_id']
    })
    console.log('Programas sincronizados')
  } catch (error) {
    console.log(error)
  }
}
