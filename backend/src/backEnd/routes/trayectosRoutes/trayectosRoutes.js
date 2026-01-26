import { deleteTrayecto, getTrayectos, postTrayecto, puTrayecto } from '#querys/trayecto/getTrayectos.js'
import express from 'express'
import { validateAdminUser } from '#middlewares/middlewares.js'
const Router = express.Router()

Router.get('/trayectos', async (_, res) => {
  const trayectos = await getTrayectos()
  res.json(trayectos)
})

Router.post('/trayectos', validateAdminUser, express.json(), async (req, res) => {
  const trayectos = await postTrayecto(req.body)
  res.json(trayectos)
})

Router.put('/trayectos', validateAdminUser, express.json(), async (req, res) => {
  const trayectos = await puTrayecto(req.body)
  res.json(trayectos)
})

Router.delete('/trayectos', validateAdminUser, express.json(), async (req, res) => {
  const trayectos = await deleteTrayecto(req.body)
  res.json(trayectos)
})

export default Router
