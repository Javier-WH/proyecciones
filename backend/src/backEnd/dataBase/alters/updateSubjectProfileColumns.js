import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()
const subjectIdConstraintCandidates = ['perfiles_ibfk_2', 'perfiles_subject_id_foreign']

async function dropLegacySubjectConstraint () {
  for (const constraintName of subjectIdConstraintCandidates) {
    try {
      await queryInterface.removeConstraint('perfiles', constraintName)
      console.log(`Constraint '${constraintName}' eliminada.`)
      return
    } catch (error) {
      if (error?.original?.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && error?.original?.errno !== 1091) {
        // Ignore not found errors, log others
        console.warn(`No se pudo eliminar constraint '${constraintName}':`, error.message)
      }
    }
  }
}

export default async function updateSubjectProfileColumns () {
  try {
    const tableInfo = await queryInterface.describeTable('perfiles')

    if (tableInfo?.subject_id && tableInfo.subject_id.type !== 'VARCHAR(36)') {
      console.log("Actualizando longitud de 'subject_id' en la tabla 'perfiles'...")
      await dropLegacySubjectConstraint()
      await queryInterface.changeColumn('perfiles', 'subject_id', {
        type: DataTypes.STRING(36),
        allowNull: false
      })
    }

    if (!tableInfo?.subject_name) {
      console.log("Agregando columna 'subject_name' a la tabla 'perfiles'...")
      await queryInterface.addColumn('perfiles', 'subject_name', {
        type: DataTypes.STRING,
        allowNull: true
      })
    }
  } catch (error) {
    console.error('Error al actualizar columnas de perfiles:', error)
  }
}
