/* eslint-disable camelcase */
import Subjects from '#models/subjects.js'
import Pensums from '#models/pensum.js'
import Pnfs from '#models/pnf.js'
import Trayecto from '#models/trayecto.js'
import { Sequelize } from 'sequelize'

export default async function getPensum (req, res) {
  const { pnf_id, trayecto_id } = req.query

  if (!pnf_id || !trayecto_id) {
    return res.status(400).json({ message: 'pnf_id y trayecto_id son requeridos' })
  }

  try {
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
      where: {
        pnf_id,
        trayecto_id
      },
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
    res.status(200).json(subjectList)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error al obtener el pensum' })
  }
}
