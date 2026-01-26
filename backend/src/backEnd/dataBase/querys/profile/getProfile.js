import Profile from '#models/perfil.js'
import ProfileNames from '#models/perfilNames.js'
import { formatPerfilRecords } from '#utils/subjectProfile.js'
import { Sequelize } from 'sequelize'

async function getProfile (active = 1) {
  const result = await Profile.findAll({
    attributes: [
      'id',
      'perfil_name_id',
      'subject_id',
      'subject_name',
      [Sequelize.col('perfil_name.name'), 'perfil_name']
    ],
    raw: true,
    nest: true,
    include: [
      {
        model: ProfileNames,
        attributes: [],
        as: 'perfil_name'
      }
    ]
  })
  return await formatPerfilRecords(result)
}
export default getProfile
