import Turnos from '#models/turnos.js'
import express from 'express'
const Router = express.Router()

Router.get('/turnos', async (_, res) => {
  const turnos = await Turnos.findAll({ raw: true })
  res.json(turnos)
})

export default Router
