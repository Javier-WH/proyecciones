/**
 * Este archivo es para realizar la validación de las respuestas de los fetch
 */

import validateFetchResponse from '../utils/validateFetchResponse.js'

export default function fetchResponse (data) {
  const { error, value } = validateFetchResponse(data)
  if (error) {
    console.error('error de validacion en la respuesta de fetch: ', error.message)
    return null
  }

  return value
}
