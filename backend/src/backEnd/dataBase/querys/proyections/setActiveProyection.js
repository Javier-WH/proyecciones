/* eslint-disable camelcase */
import config from '#models/config.js'
import { recalcSchedulesForProyection } from '../../../schedule/scheduleService.js'
import { getIO } from '../../../socket/socket.js'

export default async function getActiveProyection (req, res) {
  const { active_proyection } = req.body

  // Validar que se proporcionó el campo active_proyection
  if (!active_proyection) {
    return res.status(400).json({ error: 'No ha suministrado un id' })
  }

  try {
    // Buscar o crear el registro con id: 1
    const [proyection, created] = await config.findOrCreate({
      where: { id: 1 }, // Condición de búsqueda
      defaults: { active_proyection } // Valores por defecto si no existe
    })

    // Si el registro ya existía, actualizarlo
    if (!created) {
      await config.update({ active_proyection }, { where: { id: 1 } })
    }

    // Responder con el registro actualizado o creado
    const io = getIO()
    if (io) recalcSchedulesForProyection(active_proyection, io)
    res.json(proyection)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar actualizar la proyección' })
  }
}
