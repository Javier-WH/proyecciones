import Proyections from '#models/proyections.js'

export default async function deleteProyection(req, res) {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'Se requiere el ID de la proyección' })
    }

    const deleted = await Proyections.destroy({
      where: {
        id: id
      }
    })

    if (deleted) {
      res.status(200).json({ message: 'Proyección eliminada correctamente' })
    } else {
      res.status(404).json({ error: 'Proyección no encontrada' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar la proyección' })
  }
}
