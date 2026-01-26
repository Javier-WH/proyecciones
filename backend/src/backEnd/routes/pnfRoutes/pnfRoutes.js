import deletePNF from '#querys/pnf/deletePNF.js'
import { getPnfs } from '#querys/pnf/getPnf.js'
import postPNF from '#querys/pnf/postPNF.js'
import express from 'express'
import { validateAdminUser } from '#middlewares/middlewares.js'
const Router = express.Router()

Router.get('/pnfs', async (_, res) => {
  const pnfs = await getPnfs()
  res.json(pnfs)
})

Router.post('/pnf', validateAdminUser, express.json(), postPNF)

Router.delete('/pnf/:id', validateAdminUser, deletePNF)

export default Router
