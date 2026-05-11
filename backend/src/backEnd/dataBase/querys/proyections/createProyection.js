/* eslint-disable camelcase */
import Proyections from '#models/proyections.js'
import { v4 as uuidv4 } from 'uuid'
import { recalcSchedulesForProyection } from '../../../schedule/scheduleService.js'
import { getIO } from '../../../socket/socket.js'

export default async function createProyection (req, res) {
  const { year, name } = req.body

  if (!year || !name) {
    return res.status(401).json({ error: 'Faltan campos requeridos' })
  }

  try {
    // se verifica si ya existe un year registrado
    const existingYear = await Proyections.findOne({
      where: {
        year
      },
      order: [['createdAt', 'DESC']],
      raw: true
    })

    let subjects = '[]'

    if (existingYear) {
      subjects = existingYear?.subjects || '[]'
    }

    // se crea la proyeccion
    const id = uuidv4()
    await Proyections.create({ id, year, name, subjects })
    const io = getIO()
    if (io) recalcSchedulesForProyection(id, io)
    res.status(201).json({ message: 'Proyeccion creada exitosamente' })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe una proyeccion con ese nombre' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error al crear la proyection' })
  }
}
