import sequelize from '#dataBaseConnection'
import tableList from './tables.js'
import addPNFColumnToTeacherTable from '../alters/addPNFColumnToTeacherTable.js'
import updateSubjectProfileColumns from '../alters/updateSubjectProfileColumns.js'
import updateTeacherRestrictionsColumns from '../alters/updateTeacherRestrictionsColumns.js'
import updateSubjectRestrictionsColumns from '../alters/updateSubjectRestrictionsColumns.js'
import addIsPlaceholderColumnToTeacherTable from '../alters/addIsPlaceholderColumnToTeacherTable.js'
import updateScheduleConfigColumns from '../alters/updateScheduleConfigColumns.js'
import addClassroomActiveColumn from '../alters/addClassroomActiveColumn.js'
import addIsExclusiveToSubjectRestrictions from '../alters/addIsExclusiveToSubjectRestrictions.js'

export const createTables = async () => {
  console.log('--- Verificando base de datos y esquemas ---')

  console.log('Verificando estructura de subjects_restrictions...')
  await updateSubjectRestrictionsColumns()

  console.log('Sincronizando tablas base...')
  for (const table of tableList) {
    await table.sync()
  }

  console.log('Aplicando modificaciones de columnas (Alters)...')
  await addPNFColumnToTeacherTable()
  await updateSubjectProfileColumns()
  await updateTeacherRestrictionsColumns()
  await addIsPlaceholderColumnToTeacherTable()
  await updateScheduleConfigColumns()
  await addClassroomActiveColumn()
  await addIsExclusiveToSubjectRestrictions()

  console.log('--- Verificación de base de datos completada ---')
}

export const dropTables = async () => {
  // Disable foreign key checks
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const table of [...tableList].reverse()) {
      await table.drop()
    }
  } finally {
    // Enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
  }
}
