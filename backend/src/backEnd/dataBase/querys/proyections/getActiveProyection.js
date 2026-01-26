import config from '#models/config.js'
import Proyections from '#models/proyections.js'

export default async function getActiveProyection (req, res) {
  try {
    const proyection = await config.findOne({ where: { id: 1 }, raw: true })
    if (!proyection) {
      return res.status(404).json({ error: 'No se encontro la proyeccion activa' })
    }

    const proyectionId = proyection.active_proyection
    const proyectionExist = await Proyections.findOne({ where: { id: proyectionId }, raw: true })
    if (!proyectionExist) {
      return res.status(404).json({ error: 'No se encontro la proyeccion activa' })
    }
    res.json(proyection)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar obtener la proyeccion activa' })
  }
}
