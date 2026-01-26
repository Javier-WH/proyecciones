import getInscriptionData from '#proyeccion/getInscriptionData.js'
import getPNFPensum from '#proyeccion/getPNFPensum.js'
import createProyection from '#querys/proyections/createProyection.js'
import getActiveProyection from '#querys/proyections/getActiveProyection.js'
import setActiveProyection from '#querys/proyections/setActiveProyection.js'
import getProyections from '#querys/proyections/getProyection.js'
import express from 'express'
import { validateAdminUser } from '#middlewares/middlewares.js'
import getMayasNames from '#proyeccion/getMayas.js'
import deleteProyection from '#querys/proyections/deleteProyection.js'
const Router = express.Router()

Router.get('/proyecciones/inscriptionData/:pnf/:trayecto', getInscriptionData)

Router.get('/proyecciones/pensum/:pnf/:trayecto/:mayaId', getPNFPensum)

Router.get('/proyecciones/mayas/:pnfSagaId', getMayasNames)

Router.get('/proyeccions', getProyections)

Router.get('/config', getActiveProyection)

Router.post('/proyeccion', express.json(), createProyection)

Router.post('/setProyection', validateAdminUser, express.json(), setActiveProyection)

Router.delete('/proyeccion/:id', validateAdminUser, deleteProyection)

export default Router
