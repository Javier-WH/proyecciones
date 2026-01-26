/**
 * Este archivo es para realizar el login de la API de SAGA
 */

import fetchResponse from './fetchResponse.js'
import dotenv from 'dotenv'
dotenv.config()

const url = `${process.env.API_URL || 'http://0.0.0.0:8000/api/v1'}/login`
const method = 'POST'
const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
}
const body = JSON.stringify({
  user: process.env.API_USER || 'defaultAdmin',
  password: process.env.API_PASSWORD || '123456789'
})

export default async function fetchLogin () {
  try {
    const response = await fetch(url, { method, headers, body })
    const loginData = await response.json()
    if (loginData.status !== 200) {
      return fetchResponse({
        error: true,
        message: loginData.message,
        data: null
      })
    }

    return fetchResponse({
      error: false,
      message: null,
      data: loginData.data
    })
  } catch (error) {
    return fetchResponse({
      error: true,
      message: 'Error al realizar el login en la API de SAGA-> ' + error,
      data: null
    })
  }
}

// test de login
/* fetchLogin().then((data) => {
  if (data === null) return
  if (data.error) {
    console.log(data.message)
    return
  }

  console.log(data.data.token)
}) */
