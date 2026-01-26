import Pnfs from '#models/pnf.js'

export async function getPnfs () {
  return await Pnfs.findAll({ raw: true })
}
