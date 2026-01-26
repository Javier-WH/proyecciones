import Turnos from '#models/Turnos.js'

export async function getTrayectos () {
  return await Turnos.findAll({ raw: true })
}
