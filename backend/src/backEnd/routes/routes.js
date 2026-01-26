import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import { generateExcelReport } from '../report/excelReport.js'
import userRoutes from './userRoutes/userRoutes.js'
import teacherRoutes from './teacherRoutes/teacherRoutes.js'
import pnfRoutes from './pnfRoutes/pnfRoutes.js'
import subjectsRoutes from './subjectsRoutes/subjectsRoutes.js'
import trayectosRoutes from './trayectosRoutes/trayectosRoutes.js'
import turnosRoutes from './turnosRoutes/turnosRoutes.js'
import proyectionRoutes from './proyectionRoutes/proyectionRoutes.js'
import profileRoutes from './profileRoutes/profileRoutes.js'
import contractRoutes from './contractRoutes/contracRoutes.js'
import simpleDataRoutes from './simpleDataRoutes/simpleDataRoutes.js'
import ScheduleRoutes from './scheduleRoutes/scheduleRoutes.js'
import { validateLogedUser } from '../middlewares/middlewares.js'
const Router = express.Router()

// Obtener la ruta absoluta del directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

Router.use(userRoutes)
Router.all('*', validateLogedUser) // middleware que verifica si el usuario inició sesión
Router.use(teacherRoutes)
Router.use(pnfRoutes)
Router.use(subjectsRoutes)
Router.use(trayectosRoutes)
Router.use(turnosRoutes)
Router.use(proyectionRoutes)
Router.use(profileRoutes)
Router.use(contractRoutes)
Router.use(simpleDataRoutes)
Router.use(ScheduleRoutes)

Router.post('/excelreport', express.json(), generateExcelReport)

Router.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontEnd', 'index.html'))
})

export default Router
