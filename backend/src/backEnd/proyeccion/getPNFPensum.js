import Pensum from '#models/pensum.js'
import Pnf from '#models/pnf.js'
import Trayecto from '#models/trayecto.js'
import Subject from '#models/subjects.js'
import fethSubjectAPI from '#fetch/fethSubjectsAPI.js'

import { Sequelize } from 'sequelize'
export default async function getPNFPensum(req, res) {
  const { pnf: pnfId, trayecto: trayectoId, mayaId } = req.params

  const pnf = await Pnf.findOne({
    where: { id: pnfId },
    raw: true
  })
  if (!pnf) {
    res.status(400).json({ error: true, message: 'No se ha encontrado el pnf' })
    return
  }
  const pnfName = pnf.name

  const trayectoData = await Trayecto.findOne({
    where: { id: trayectoId },
    raw: true
  })
  if (!trayectoData) {
    res.status(400).json({ error: true, message: 'No se ha encontrado el trayecto' })
    return
  }

  const trayectoName = trayectoData.name

  /* const pensums = await Pensum.findAll({
     where: {
       pnf_id: pnfId,
       trayecto_id: trayectoId,
       active: true
     },
     include: [
       {
         model: Subject,
         attributes: []
       },
       {
         model: Trayecto,
         attributes: [],
         as: 'trayecto'
       }
     ],
     attributes: [
       'id',
       'subject_id',
       'hours',
       'quarter',
       [Sequelize.col('subject.name'), 'subject'],
       [Sequelize.col('trayecto.saga_id'), 'trayecto_saga_id']
     ],
     raw: true
   })

   if (pensums.length === 0) {
     res.status(404).json({ error: true, message: 'No se ha encontrado el pensum' })
     return
   }
   */


  const responseSubjects = await fethSubjectAPI({ pnfId: pnf.saga_id, trayectoId: trayectoData.saga_id, mayaId })

  const subjects = responseSubjects.map(subject => {
    const quarteData = subject?.quarters;
    const quarter = [
      ...(quarteData?.q1 === 1 ? [1] : []),
      ...(quarteData?.q2 === 1 ? [2] : []),
      ...(quarteData?.q3 === 1 ? [3] : []),
    ];

    const { total, times } = subject.hours;

    let quarterHours = 0;
    let weekHours = 0;

    if (total && times && isNaN(total) === false && isNaN(times) === false) {
      quarterHours = total / times;
      weekHours = quarterHours / (Number(mayaId) == 24 ? 18 : 12);
    }

    return {
      id: crypto.randomUUID(),
      subject_id: subject?.id,
      hours: weekHours.toString(),
      quarter: `[${String(quarter)}]`,
      subject: subject?.description,
      trayecto_saga_id: subject?.trayecto_info?.id,
    }
  })

  if (subjects.length === 0) {
    res.status(404).json({ error: true, message: 'No se ha encontrado el pensum' })
    return
  }


  res.status(200).json({
    error: false,
    message: null,
    data: {
      pnfName,
      pnfId,
      trayectoId,
      trayectoName,
      pensums: subjects
    }
  })
}
