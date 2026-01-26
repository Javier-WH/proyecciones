import Subjects from '#models/subjects.js'
import { v4 as uuidv4 } from 'uuid'

export default async function postSubject (req, res) {
  const { id, name, active } = req.body
  if (!name && (active === undefined || active === null)) {
    return res.status(401).json({ error: 'Faltan campos por llenar' })
  }

  const params = {}
  if (name) {
    params.name = name
  }

  if (active !== undefined || active !== null) {
    params.active = active
  }

  try {
    if (id) {
      await Subjects.update(params, { where: { id } })
      return res.status(200).json({ message: 'Materia actualizada' })
    }

    params.id = uuidv4()
    await Subjects.create(params)
    res.status(201).json({ message: 'Materia creada' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar actaulizar o crear la materia' })
  }
}
