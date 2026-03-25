import Proyections from '#models/proyections.js'
import Schedule from '#models/schedule/schedule.js'
import TeacherRestrictions from '#models/schedule/teacherRestrictions.js'
import SubjectsRestrictions from '#models/schedule/subjectsRestrictions.js'

export default async function deleteProyection(req, res) {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'Se requiere el ID de la proyección' })
    }

    // Eliminación en cascada manual de dependencias
    await Schedule.destroy({ where: { proyection_id: id } })
    // Only delete projection-specific restrictions, keep global ones
    await SubjectsRestrictions.destroy({ where: { proyection_id: id } })

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
    res.status(500).json({ error: 'Error al eliminar la proyección: ' + error.message })
  }
}
