import PerfilNames from '#models/perfilNames.js'

async function getPerfilNames () {
  try {
    const results = await PerfilNames.findAll(
      {
        attributes: [
          'id',
          'name',
          'description'
        ],
        raw: true
      }
    )
    return results
  } catch (error) {
    console.log(error)
    return {
      error: 'Ha ocurrido un error al obtener los nombres de los perfiles'
    }
  }
}

export default getPerfilNames
