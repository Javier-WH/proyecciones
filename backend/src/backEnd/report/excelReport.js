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

    // Obtener los datos de los profesores y sus materias asignadas en la proyección

    // 1. Mapear materias por ID de profesor para evitar búsquedas repetitivas
    const professorSubjectsMap = {}
    rawSubjects.forEach(subject => {
      ['q1', 'q2', 'q3'].forEach(q => {
        const teacherId = subject.quarter?.[q]
        if (teacherId) {
          if (!professorSubjectsMap[teacherId]) professorSubjectsMap[teacherId] = []
          if (!professorSubjectsMap[teacherId].some(s => s.innerId === subject.innerId)) {
            professorSubjectsMap[teacherId].push(subject)
          }
        }
      })
    })

    // 2. Identificar profesores que califican para el reporte
    const assignedIdsInPNF = new Set()
    rawSubjects.forEach(s => {
      if (s.pnfId === pnfId) {
        if (s.quarter?.q1) assignedIdsInPNF.add(s.quarter.q1)
        if (s.quarter?.q2) assignedIdsInPNF.add(s.quarter.q2)
        if (s.quarter?.q3) assignedIdsInPNF.add(s.quarter.q3)
      }
    })

    const teachers = await Teachers.findAll({
      where: {
        [Op.or]: [
          { id: Array.from(assignedIdsInPNF) },
          { PNF: pnfId }
        ]
      },
      raw: true
    })

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: 'No se encontraron profesores' })
    }

    // 3. Verificar contratos
    const targetTeachers = teachers.filter(t => !t.is_placeholder);
    const teachersWithoutContract = targetTeachers.filter(t => !t.contractTypes_id)

    if (teachersWithoutContract.length > 0) {
      const teachersWithoutContractCi = teachersWithoutContract.map((teacher) => teacher.ci).join(', ')
      return res.status(406).json({
        message: `Hay profesores sin contrato => ( ${teachersWithoutContractCi} )`
      })
    }

    // 4. Preparar carga académica completa
    const reportSubjects = teachers.flatMap(teacher => {
      const mySubjects = professorSubjectsMap[teacher.id] || []
      return mySubjects.map(s => ({ ...s, teacherData: teacher }))
    })

    const groupedByProgram = [reportSubjects]
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
        proyectionDate,
        contracts,
        targetPnfId: pnfId
      })
      responseWarkbook = singleQuaterWarkbook
    } else if (type === 2) {
      // genera la hoja de trimestre completo
      // eslint-disable-next-line no-unused-vars
      const { sheetNumber, workbook: triQuaterWarkbook } = generateTriQuarterSheet({
        sheetNumber: 0,
        workbook,
        pnfArray: groupedByProgram,
        proyectionDate,
        contracts,
        targetPnfId: pnfId
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
    const pnfRawObjForName = rawSubjects.find(s => s.pnfId === pnfId)
    const pnfName = cleanFileNamePart(pnfRawObjForName ? pnfRawObjForName.pnf : 'PNF').replace('P.N.F._en_', '')

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
