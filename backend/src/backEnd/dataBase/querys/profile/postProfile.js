import PerfilNames from '#models/perfilNames.js'
import { v4 as uuidv4 } from 'uuid'

export default async function setProfile ({ name, description }) {
  console.log({ name, description })
  if (!name || !description) return false

  const id = uuidv4()
  try {
    await PerfilNames.create({ id, name, description })
    return true
  } catch (error) {
    console.log(error)
    return false
  }
}
