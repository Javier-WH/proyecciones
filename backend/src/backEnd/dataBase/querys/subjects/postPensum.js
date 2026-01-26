/* eslint-disable camelcase */
import Pensums from '#models/pensum.js'
import { v4 as uuidv4 } from 'uuid'

export default async function postPensum (req, res) {
  const { id, pnf_id, subject_id, trayecto_id, hours, quarter } = req.body

  if (!pnf_id && !subject_id && !trayecto_id && !hours && !quarter) {
    return res.status(401).send('Faltan datos')
  }

  const params = {}

  if (pnf_id) params.pnf_id = pnf_id
  if (subject_id) params.subject_id = subject_id
  if (trayecto_id) params.trayecto_id = trayecto_id
  if (hours) params.hours = hours
  if (quarter) params.quarter = quarter

  try {
    if (id) {
      await Pensums.update(params, {
        where: { id }
      })
      return res.status(201).json({ message: 'Pensum actualizado' })
    }
    params.id = uuidv4()
    await Pensums.create(params)

    return res.status(201).json({ message: 'Pensum creado' })
  } catch (error) {
    console.error(error)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe un pensum con esos datos' })
    }
    return res.status(500).json({ error: 'Error en la base de datos' })
  }
}
