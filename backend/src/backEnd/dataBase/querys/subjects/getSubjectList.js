import Subjects from '#models/subjects.js'
import Pensums from '#models/pensum.js'
import Pnfs from '#models/pnf.js'
import Trayecto from '#models/trayecto.js'
import { Sequelize } from 'sequelize'

export default async function getSubjectList () {
  const result = await Pensums.findAll({
    attributes: [
      ['id', 'pensum_id'],
      ['subject_id', 'id'],
      [Sequelize.col('subject.name'), 'subject'],
      'hours',
      [Sequelize.col('pnf.name'), 'pnf'],
      'quarter',
      [Sequelize.col('trayecto.id'), 'trayectoId'],
      [Sequelize.col('trayecto.name'), 'trayectoName'],
      [Sequelize.col('trayecto.saga_id'), 'trayecto_saga_id']
    ],
    include: [
      {
        model: Pnfs,
        attributes: [],
        as: 'pnf'
      },
      {
        model: Subjects,
        attributes: [],
        as: 'subject'
      },
      {
        model: Trayecto,
        attributes: [],
        as: 'trayecto'
      }
    ],
    raw: true
  })

  const subjectList = result.map(subject => {
    subject.seccion = '1'
    subject.quarter = JSON.parse(subject.quarter)
    subject.hours = subject.hours === null ? 0 : parseInt(subject.hours)
    return subject
  })
  return subjectList
}

// materia del arreglo
/* {
  id: '4ea0e3b4-3a9c-47a2-a2ae-9814231ee4c2',
  subject: 'Emprendimiento',
  hours: 10,
  pnf: 'Agroalimentación',
  quarter: [1, 2],
  seccion: '1'
}, */

/**
 * materia del api
 *  {
    id: 16103,
    description: 'TALLER DE INGLÉS I',
    ucr: null,
    trayecto_info: { id: 1, trayecto: 'TRAYECTO I', status: 'A' },
    programa_info: {
      id: 16,
      programa: 'Admon Mision Sucre',
      status: 'I',
      largo: null,
      char: null
    }
  },
 *
 */
