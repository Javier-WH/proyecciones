import Days from '#models/schedule/days.js'

export async function getDays (req, res) {
  try {
    const days = await Days.findAll({ raw: true })
    res.json(days)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar obtener los dias' })
  }
}

export async function addDay (req, res) {
  const { day } = req.body
  if (!day) {
    return res.status(400).json({ error: "El campo 'day' es obligatorio" })
  }
  try {
    const newDay = await Days.create({ day })
    res.status(201).json({ message: 'Dia agregado correctamente', day: newDay })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar agregar el dia' })
  }
}

export async function deleteDay (req, res) {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ error: "El campo 'id' es obligatorio" })
  }
  try {
    await Days.destroy({ where: { id } })
    res.status(200).json({ message: 'Dia eliminado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar eliminar el dia' })
  }
}

export async function updateDay (req, res) {
  const { id, day } = req.body
  if (!id || !day) {
    return res.status(400).json({ error: "Los campos 'id' y 'day' son obligatorios" })
  }
  try {
    await Days.update({ day }, { where: { id } })
    res.status(200).json({ message: 'Dia actualizado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al intentar actualizar el dia' })
  }
}
