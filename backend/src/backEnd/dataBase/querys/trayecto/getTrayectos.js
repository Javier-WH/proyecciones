import Trayectos from '#models/trayecto.js'
import { v4 as uuidv4 } from 'uuid'

export async function getTrayectos () {
  return await Trayectos.findAll({ raw: true })
}

export async function puTrayecto ({ id, name, order }) {
  if (!id) return false
  if (!name && (order === undefined || order === null)) return false
  const params = {}
  if (name) params.name = name
  if (order !== undefined || order !== null) params.order = order
  try {
    await Trayectos.update(params, { where: { id } })
    return true
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return {
        error: 'El orden está en uso'
      }
    }
    return {
      error: error.name
    }
  }
}

export async function postTrayecto ({ name, order }) {
  if (!name || order === undefined || order === null) return false
  try {
    const id = uuidv4()
    await Trayectos.create({ id, name, order })
    return true
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return {
        error: 'El orden está en uso'
      }
    }
    return {
      error: error.name
    }
  }
}

export async function deleteTrayecto ({ id }) {
  if (!id) return false
  await Trayectos.destroy({ where: { id } })
  return true
}
