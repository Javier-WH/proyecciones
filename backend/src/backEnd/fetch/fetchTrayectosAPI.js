import getApiToken from '#ApiToken'

export default async function fetchTrayectosAPI () {
  const token = await getApiToken()

  if (!token) {
    console.error('No se ha podido obtener el token de la API de SAGA')
    return null
  }

  const url = `${process.env.API_URL || 'http://0.0.0.0:8000/api/v1'}/trayectos`
  const method = 'GET'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  try {
    const response = await fetch(url, { method, headers })
    if (response.status !== 200) {
      console.log(response.status)
      return null
    }
    const trayectosData = await response.json()

    return trayectosData.data ? trayectosData.data : null
  } catch (error) {
    console.error(error)
    return null
  }
}
