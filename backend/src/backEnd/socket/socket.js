import { Server } from 'socket.io'
import getTeacherList from '#querys/teachers/getTeacherList.js'
import { checkIfProyectionExists } from './socketUtils.js'
import { updateProyection } from '../dataBase/create/updateProyection.js'
import Config from '#models/config.js'
import validateSubjectData from '#utils/validateSubject.js'

let io = null

let currentProyectionId = ''

// Array de profesores
let teachers = []

// array de asignaturas
let subjects = []

// Nombre de la proyección
let proyectionName = 'desconocido'
let proyectionId = null

// Verificar si hay una proyeccion activa
export const loadProyection = async () => {
  await setTeacherList()
  // se obtiene el id de la proyeccion activa
  const requestConfigData = await Config.findOne({ where: { id: 1 }, raw: true })
  if (requestConfigData?.active_proyection) {
    currentProyectionId = requestConfigData?.active_proyection
  }

  // se obtienen los datos de la proyeccion activa
  const request = await checkIfProyectionExists(currentProyectionId)
  if (request.error) {
    console.log(request.message)
    setTeacherList()
    return
  }
  proyectionName = request.data.name
  proyectionId = request.data.id
  const proyeccion = request.data

  if (proyeccion?.subjects) {
    subjects = await JSON.parse(proyeccion.subjects)
  }
}

export async function setTeacherList() {
  const teacherList = await getTeacherList()
  teachers = teacherList
  io?.emit('updateTeachers', teachers)
}

export default function setupSocket(server, sessionMiddleware) {
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true
    }
  })
  io.engine.use(sessionMiddleware)
  // Conexión WebSocket
  io.on('connection', (socket) => {
    // console.log('Usuario conectado')

    // Enviar el array de profesores y asignaturas al cliente
    socket.emit('updateTeachers', teachers)
    socket.emit('updateSubjects', subjects)

    socket.emit('proyectionData', { proyectionName, proyectionId })

    // Escuchar eventos de actualización de asignaturas
    socket.on('updateSubjects', (newSubjects) => {
      // Verificar si el usuario ha iniciado sesión antes de actualizar
      if (process.env.NODE_ENV !== 'dev') {
        const user = socket?.request?.session?.user
        if (!user) {
          console.log('El usuario no ha iniciado sesión antes de actualizar la proyección')
          socket.disconnect()
          return
        }
      }

      // verificar que el array de materias tiene el formato correcto
      /* const validName = validateSubjectData(newSubjects)
       if (validName.error) {
         console.log(validName.error)
         return
       }*/

      // Actualizar el array de asignaturas para el socket
      subjects = newSubjects
      // actualizar la base de datos de manera asincrona
      updateProyection({
        id: currentProyectionId,
        teachers: JSON.stringify(teachers),
        subjects: JSON.stringify(subjects)

      })

      // Emitir la actualización de asignaturas a todos los clientes
      io.emit('updateSubjects', subjects)
    })

    socket.on('reload', () => {
      // Verificar si el usuario ha iniciado sesión antes de actualizar
      if (process.env.NODE_ENV !== 'dev') {
        const user = socket?.request?.session?.user
        if (!user) {
          console.log('El usuario no ha iniciado sesión antes de actualizar la proyección')
          socket.disconnect()
          return
        }
      }
      loadProyection().then(() => {
        socket.emit('updateTeachers', teachers)
        socket.emit('updateSubjects', subjects)
        socket.emit('proyectionData', { proyectionName, proyectionId })
      })
    })

    // Escuchar eventos de error
    socket.on('error', (error) => {
      console.log(error)
    })
  })

  return io
}

