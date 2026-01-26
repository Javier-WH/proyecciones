/* eslint-disable camelcase */
import Profile from '#models/perfil.js'
import ProfileNames from '#models/perfilNames.js'
import connection from '#dataBaseConnection'

async function deleteProfile (req, res) {
  const { perfil_name_id } = req.params
  if (!perfil_name_id) {
    return res.status(401).json({ error: 'debe suministrar un id de nombre de perfil' })
  }

  console.log(perfil_name_id)

  const transaction = await connection.transaction()

  try {
    await Profile.destroy(
      {
        where: {
          perfil_name_id
        }
      },
      { transaction }
    )

    await ProfileNames.destroy(
      {
        where: {
          id: perfil_name_id
        }
      },
      { transaction }
    )

    await transaction.commit()
    res.status(200).json({ message: 'perfil eliminado' })
  } catch (error) {
    console.log(error)
    await transaction.rollback()
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const constraint = error?.parent?.sqlMessage?.match(/CONSTRAINT `(.+?)`/)?.[1] || 'desconocida'

      if (constraint.includes('teachers')) {
        return res.status(403).json({
          error: 'No se puede eliminar el perfil porque se encuentra asignado a un docente.'
        })
      }
      return res.status(403).json({
        error: 'No se puede eliminar el perfil por un error desconocido'
      })
    }
  }
}
export default deleteProfile
