import fethInscriptionAPI from '#fetch/fetchInscriptionAPI.js'
import Pnf from '#models/pnf.js'
import Trayectos from '#models/trayecto.js'
import Turnos from '#models/turnos.js'

export default async function getInscriptionData (req, res) {
  const minAprobationGrade = 10

  const { pnf: pnfId, trayecto: trayectoId } = req.params

  const pnfData = await Pnf.findOne({ where: { id: pnfId }, raw: true })
  if (!pnfData) {
    res.json({ error: true, message: 'No se encontro el pnf' })
    return
  }

  const { saga_id: pnfSagaId, name: pnfName } = pnfData

  const trayectoData = await Trayectos.findOne({ where: { id: trayectoId }, raw: true })
  if (!trayectoData) {
    res.json({ error: true, message: 'No se encontro el trayecto' })
    return
  }

  const { saga_id: trayectoSagaId, name: trayectoName } = trayectoData

  const turnos = await Turnos.findAll({ raw: true })
  if (!turnos) {
    res.json({ error: true, message: 'No se han podido cargar los turnos' })
    return
  }

  const data = await fethInscriptionAPI()
  if (!data) {
    res.json({ error: true, message: 'No se han podido cargar las proyecciones' })
    return
  }

  // filtrar por PNF
  const filterdByPnf = data.filter((item) => item.pnf_info.id === pnfSagaId)

  // filtrar aprobados y reprobados
  const fails = []
  const passed = []
  for (const student of filterdByPnf) {
    if (student.grade < minAprobationGrade) {
      fails.push(student)
    } else {
      passed.push(student)
    }
  }

  // filtrando el por trayecto
  const passedFilterdByTrayecto = passed.filter((item) => item.uc_info.trayecto_id === trayectoSagaId)
  const failsFilterdByTrayecto = fails.filter((item) => item.uc_info.trayecto_id === trayectoSagaId)

  // Eliminando duplicados por student_id
  const filteredDuplicates = passedFilterdByTrayecto.reduce((acc, current) => {
    const x = acc.find(item => item.student_id === current.student_id)
    if (!x) {
      acc.push(current)
    }
    return acc
  }, [])

  // Agrupando por turno
  const groupedByTurno = filteredDuplicates.reduce((acc, obj) => {
    const turnoName = obj.turno_info.turno
    const turnoSagaId = obj.turno_info.id

    if (!acc[turnoName]) {
      acc[turnoName] = {}
    }

    if (!acc[turnoName].id) {
      acc[turnoName].id = turnos.find(item => item.saga_id === turnoSagaId).id
    }

    if (!acc[turnoName].turnoSagaId) {
      acc[turnoName].turnoSagaId = turnoSagaId
    }

    if (!acc[turnoName].turnoName) {
      acc[turnoName].turnoName = turnoName
    }

    if (!acc[turnoName].inscriptionData) {
      acc[turnoName].inscriptionData = []
    }
    acc[turnoName].inscriptionData.push(obj.student_info)

    acc[turnoName].total = acc[turnoName].inscriptionData.length

    return acc
  }, {})

  const response = {
    error: false,
    message: null,
    data: {
      minAprobationGrade,
      pnfName,
      pnfId,
      pnfSagaId,
      trayectoName,
      trayectoId,
      trayectoSagaId,
      totalFails: failsFilterdByTrayecto.length,
      totalPassed: filteredDuplicates.length,
      fails,
      passed: groupedByTurno
    }
  }

  res.json(response)
}
