import { createServer } from 'node:http'
import express from 'express'
import dotenv from 'dotenv'
import configureStatic from './config/static/configureStatic.js'
import configureCors from './config/cors/corsConfig.js'
import Routes from './routes/routes.js'
import setupSocket, { loadProyection } from './socket/socket.js'
import getServerIP from './utils/serverIP.js'
import { createTables } from './dataBase/create/createTables.js'
import setTableRelations from './dataBase/relations/tableRelations.js'
import syncSagaTables from './dataBase/sycnSagaDB/syncSagaTables.js'
import syncSchedule from './dataBase/syncScheduleTables/syncSchedule.js'
import session from 'express-session'
import connectSessionSequelize from 'connect-session-sequelize'
import sequelize from '#dataBaseConnection'

dotenv.config()
const app = express()
const server = createServer(app)
app.set('trust proxy', 1)
// session
const SequelizeStore = connectSessionSequelize(session.Store)

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000
})

// base de datos
// base de datos
await createTables()
setTableRelations()
await syncSagaTables()
await syncSchedule()
await sessionStore.sync()
await loadProyection()

// cors
configureCors(app)

// Configuración de middleware de sesión
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'UPTLL_Juana_Ramirez',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
})

app.use(sessionMiddleware)

// archivos estaticos
configureStatic(app)

// rutas
app.use(Routes)

// socket
setupSocket(server, sessionMiddleware)

const port = process.env.PORT || 3000
const host = process.env.IP || '0.0.0.0'

server.listen(port, host, () => {
  // console.clear()
  console.log(`Servidor corriendo en el socket http://${getServerIP()}:${port}`)
})
