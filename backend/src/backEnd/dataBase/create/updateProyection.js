/* eslint-disable camelcase */
import Proyections from '#models/proyections.js'

export async function updateProyection ({ id, subjects }) {
  if (!id) return false
  if (!subjects) return false

  const params = {}
  if (subjects) params.subjects = subjects

  try {
    await Proyections.update(params, { where: { id } })
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function getProyection (id) {
  if (!id) return false
  try {
    const proyection = await Proyections.findOne({ where: { id }, raw: true })
    return proyection
  } catch (error) {
    console.error(error)
    return false
  }
}
