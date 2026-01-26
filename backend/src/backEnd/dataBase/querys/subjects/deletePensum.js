import Pensum from '#models/pensum.js'

export default async function deletePensum (req, res) {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ error: 'no ha suministrado un id' })
  }

  try {
    await Pensum.destroy({ where: { id } })
    return res.status(200).json({ message: 'Pensum eliminado' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al intentar eliminar el pensum' })
  }
}
