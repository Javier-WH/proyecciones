import Pnf from '#models/pnf.js'

export default async function deletePNF (req, res) {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ error: 'no ha suministrado un id' })
  }

  try {
    await Pnf.destroy({ where: { id } })
    return res.status(200).json({ message: 'Pnf eliminado' })
  } catch (error) {
    console.error(error)
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ error: 'No se puede eliminar el pnf porque tiene materias asociadas' })
    }
    return res.status(500).json({ error: 'Error al intentar eliminar el pnf' })
  }
}
