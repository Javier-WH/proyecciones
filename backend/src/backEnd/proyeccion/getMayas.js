import fethMayasNames from '#fetch/fetchMayas.js'

export default async function getMayasNames(req, res) {
  const { pnfSagaId } = req.params

  if (!pnfSagaId) {
    res.status(400).json({ error: true, message: 'No se ha proporcionado identificador del pnf saga' })
    return
  }

  const mayasData = await fethMayasNames({ pnfSagaId })
  if (!mayasData) {
    res.status(400).json({ error: true, message: 'No se ha encontrado el maya para el pnf saga' })
    return
  }

  res.status(200).json({
    error: false,
    message: null,
    data: {
      mayas: mayasData
    }
  })
}
