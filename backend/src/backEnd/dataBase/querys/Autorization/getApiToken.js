import fetchLogin from '#fetch/fetchLoginAPI.js'
export default async function getApiToken () {
  const loginData = await fetchLogin()

  if (loginData.error) {
    console.error(loginData.message)
    return null
  }

  const { token } = loginData.data

  if (!token) {
    console.error('No se ha podido obtener el token de la API de SAGA')
    return null
  }

  return token
}
