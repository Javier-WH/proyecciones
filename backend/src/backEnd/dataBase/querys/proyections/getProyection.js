import Proyections from '#models/proyections.js'
export default async function getProyections (req, res) {
  try {
    const proyections = await Proyections.findAll()
    res.json(proyections)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar obtener las proyecciones' })
  }
}
