import XlsxPopulate from 'xlsx-populate'
import Proyections from '#models/proyections.js'
import Config from '#models/config.js'
import Teachers from '#models/teachers.js'
import generateSingleQuarterSheet from './singleQuarterSheet.js'
import generateTriQuarterSheet from './triQuarterSheet copy.js'
import Contracts from '#models/contractType.js'
import { Op } from 'sequelize'

export async function generateExcelReport(req, res) {
  const { pnfId, type } = req.body
  if (!pnfId) {
    return res.status(400).json({ message: 'El ID del PNF es requerido' })
  }
  if (!type || (type !== 1 && type !== 2)) {
    return res.status(400).json({ message: 'El tipo de reporte es requerido' })
  }
  try {
    const contracts = await Contracts.findAll({ raw: true })
    if (!contracts) {
      return res.status(404).json({ message: 'No se encontró los tipos de contrato' })
    }

    // Obtener el ID de la proyección activa desde la base de datos
    const activeProyection = await Config.findOne({ where: { id: 1 }, raw: true })
    const activeProyectionId = activeProyection.active_proyection
    if (!activeProyectionId) {
      return res.status(404).json({ message: 'No se encontró la proyección activa' })
    }

    // Obtener los datos de la proyección activa desde la base de datos
    const proyection = await Proyections.findOne({ where: { id: activeProyectionId }, raw: true })
    if (!proyection) {
      return res.status(404).json({ message: 'No se encontró la proyección marcada como activa no existe' })
    }
    // obtener la fecha de inicio y fin de la proyección
    const proyectionDate = formatQuarterDateRange(proyection.createdAt)

    // Verificar si la proyección tiene materias asignadas
    if (!proyection.subjects) {
      return res.status(404).json({ message: 'No se encontraron materias en la proyección' })
    }
    const rawSubjects = JSON.parse(proyection.subjects)

    // agrupar materias por pnf
    const filteredSubjects = rawSubjects.filter((subject) => subject.pnfId === pnfId)
    if (filteredSubjects.length === 0) {
      return res.status(404).json({ message: 'No se encontraron materias para el PNF especificado' })
    }

    // agrupar las materias por profesor
    const groupedSubjects = groupSubjectsByProfessor(filteredSubjects)

    // Obtener los datos de los profesores desde la base de datos
    const teachersIDs = groupedSubjects
      .map((group) => group.professorId)
      .filter((id) => id !== 'UNASIGNED')

    const teachers = await Teachers.findAll({
      where: {
        [Op.or]: [{ id: teachersIDs }, { PNF: pnfId }]
      },
      raw: true
    })

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: 'No se encontraron profesores' })
    }

    // revisar si todos los profesores tienen un contrato
    const teachersWhioutContract = teachers.filter(
      (teacher) =>
        teacher.contractTypes_id === null ||
        teacher.contractTypes_id === undefined ||
        teacher.contractTypes_id === ''
    )

    if (teachersWhioutContract.length > 0) {
      const teachersWhioutContractCi = teachersWhioutContract.map((teacher) => teacher.ci).join(', ')
      return res.status(406).json({
        message: `Hay materias asociadas a profesores sin contrato => ( ${teachersWhioutContractCi} )`
      })
    }

    const reportData = groupedSubjects.map((group) => {
      let teacher = teachers.find((t) => t.id === group.professorId)

      // Si no se encuentra el profesor o el ID es UNASIGNED, asignar datos por defecto
      if (!teacher) {
        teacher = {
          id: group.professorId || 'UNASIGNED',
          name: 'SIN PROFESOR ASIGNADO',
          lastName: '',
          ci: 'S/C',
          contractTypes_id: 'S/C'
        }
      }

      return {
        ...group,
        teacherData: teacher
      }
    })

    // agrupar los datos por pnf
    let groupedByProgram = groupSubjectsByPnfFromProfessorArray(reportData)

    /// /////////////////////////////////////////
    // agrea las materias que el profesor dá en otros pnf
    // 1. se determina que materias tiene ese profesor en otro pnf
    const missedSubjects = groupedByProgram?.[0].map((subject) => {
      const teacherId = subject.teacherData?.id
      const teacherData = subject.teacherData

      // filtra el pnf para evitar agregar las mismas materias ya agregadas
      const nonPNFsubjects = rawSubjects
        .filter((rawSubject) => rawSubject.pnfId !== pnfId)
        .filter(
          (rawSubject) =>
            rawSubject?.quarter?.q1 === teacherId ||
            rawSubject?.quarter?.q2 === teacherId ||
            rawSubject?.quarter?.q3 === teacherId
        )
        .map((rawSubject) => {
          rawSubject.teacherData = teacherData
          return rawSubject
        })

      return nonPNFsubjects
    })

    // crea un nuevo objeto con todas las materias que da el profesor de todos los pnf
    const wholeSubjects = [groupedByProgram?.[0], ...missedSubjects.flat()]
    groupedByProgram = [wholeSubjects.flat()]
    /// /////////////////////////////////

    // Crear un nuevo libro de Excel
    const workbook = await XlsxPopulate.fromBlankAsync()

    let responseWarkbook = null

    if (type === 1) {
      // genera las hojas de trimestres individuales
      // eslint-disable-next-line no-unused-vars
      const { sheetNumber, workbook: singleQuaterWarkbook } = generateSingleQuarterSheet({
        sheetNumber: 0,
        workbook,
        pnfArray: groupedByProgram,
        // pnfArray: [wholeSubjects.flat()],
        proyectionDate,
        contracts
      })
      responseWarkbook = singleQuaterWarkbook
    } else if (type === 2) {
      // genera la hoja de trimestre completo
      // eslint-disable-next-line no-unused-vars
      const { sheetNumber, workbook: triQuaterWarkbook } = generateTriQuarterSheet({
        sheetNumber: 0,
        workbook,
        pnfArray: groupedByProgram,
        // pnfArray: [wholeSubjects.flat()],
        proyectionDate,
        contracts
      })
      responseWarkbook = triQuaterWarkbook
    }
    if (!responseWarkbook) {
      return res.status(500).json({ message: 'Error al generar el reporte' })
    }

    // Generar el archivo de Excel en un buffer en memoria
    const data = await workbook.outputAsync()

    // obtener el nombre de la proyección
    const proyectionName = cleanFileNamePart(proyection?.name)

    // obtener el nombre del pnf
    const pnfName = cleanFileNamePart(filteredSubjects[0]?.pnf).replace('P.N.F._en_', '')

    // --- Obtener y formatear la fecha actual ---
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const year = today.getFullYear()
    const formattedDate = `${day}-${month}-${year}`

    // tipo de reporte
    const reportType = type === 1 ? 'trimestral' : 'anual'

    // crea un numbre de archivo
    const filename = `${proyectionName}-${pnfName}-${reportType}-(${formattedDate}).xlsx`

    // Configurar las cabeceras de la respuesta para la descarga del archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

    // Enviar el buffer como respuesta
    res.status(200).send(data)
  } catch (err) {
    console.error('Error generating report:', err)
    res.status(500).json({ message: 'Error al generar el reporte', error: err.message })
  }
}

function groupSubjectsByProfessor(subjects) {
  const professorsMap = {}

  subjects.forEach((subject) => {
    const quarters = subject.quarter

    const subjectWithoutQuarter = {
      ...subject
    }

    const targetQuarters = ['q1', 'q2', 'q3']

    for (const quarterKey of targetQuarters) {
      if (Object.prototype.hasOwnProperty.call(quarters, quarterKey)) {
        const professorId = quarters[quarterKey] || 'UNASIGNED'

        // If the professorId doesn't exist in our map, create an entry
        if (!professorsMap[professorId]) {
          professorsMap[professorId] = {
            professorId,
            subjects: []
          }
        }
        professorsMap[professorId].subjects.push(subjectWithoutQuarter)
      }
    }
  })

  // Convert the map values into an array
  return Object.values(professorsMap)
}

function groupSubjectsByPnfFromProfessorArray(professorsWithSubjects) {
  const pnfSubjectsMap = {} // Map to hold arrays of subjects, grouped by PNF

  // Iterate through each professor's data (which includes teacherData)
  professorsWithSubjects.forEach((professorData) => {
    // Get the teacherData associated with this professor
    const teacherData = professorData.teacherData

    // Iterate through the subjects assigned to this professor
    professorData.subjects.forEach((subject) => {
      const pnfId = subject.pnfId

      // Ensure the pnfId exists
      if (pnfId) {
        // If the PNF ID is not yet a key in the map, initialize its array
        if (!pnfSubjectsMap[pnfId]) {
          pnfSubjectsMap[pnfId] = [] // The value is just an array of subjects for this PNF
        }

        // Create a new object that is a copy of the subject,
        // and add the teacherData property to it.
        const subjectWithTeacher = {
          ...subject, // Copy all properties from the original subject
          teacherData // Add the teacherData key with the current professor's data
        }

        // Push this new object (subject with teacherData) into the array for its PNF
        pnfSubjectsMap[pnfId].push(subjectWithTeacher)
      }
    })
  })

  // Convert the map values (which are the arrays of subjects, now including teacherData)
  // into a single array. This preserves the structure [ [PNF1 subjects], [PNF2 subjects], ... ]
  return Object.values(pnfSubjectsMap)
}

function formatQuarterDateRange(dateString) {
  const date = new Date(dateString)

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Fecha inválida' // Or handle the error as needed
  }

  const monthNames = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE'
  ]

  const startMonthIndex = date.getMonth() // getMonth() returns 0-11
  const year = date.getFullYear()

  // Calculate the index of the month 4 months later
  // Use modulo 12 to wrap around to the next year if necessary
  const endMonthIndex = (startMonthIndex + 4) % 12

  const startMonthName = monthNames[startMonthIndex]
  const endMonthName = monthNames[endMonthIndex]

  // Construct the final string in the desired format
  return `${startMonthName} – ${endMonthName} ${year}`
}

const cleanFileNamePart = (text) => {
  if (!text) return 'desconocido'

  // 1. Reemplazar vocales con tilde por vocales sin tilde
  let cleanedText = text
    .normalize('NFD') // Descompone caracteres acentuados en su forma base y el acento
    .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (acentos)

  // 2. Reemplazar uno o más espacios en blanco por un guion,
  //    pero si ya hay un guion rodeado de espacios, simplemente normaliza los espacios adyacentes.
  //    Primero, reemplazamos " - " por un guion, luego todos los demás espacios por guiones.
  //    Esto evita tener "palabra1---palabra2"
  cleanedText = cleanedText
    .replace(/\s*-\s*/g, '_') // Reemplaza " - " o " - " o " - " por un solo guion
    .replace(/\s+/g, '_') // Reemplaza cualquier otro grupo de espacios por un guion

  return cleanedText
}
