import sequelize from '#dataBaseConnection'
import tableList from './tables.js'
import addPNFColumnToTeacherTable from '../alters/addPNFColumnToTeacherTable.js'
import updateSubjectProfileColumns from '../alters/updateSubjectProfileColumns.js'
import updateTeacherRestrictionsColumns from '../alters/updateTeacherRestrictionsColumns.js'
import updateSubjectRestrictionsColumns from '../alters/updateSubjectRestrictionsColumns.js'
import addIsPlaceholderColumnToTeacherTable from '../alters/addIsPlaceholderColumnToTeacherTable.js'
import updateScheduleConfigColumns from '../alters/updateScheduleConfigColumns.js'
import addClassroomActiveColumn from '../alters/addClassroomActiveColumn.js'

export const createTables = async () => {
  await updateSubjectRestrictionsColumns()
  for (const table of tableList) {
    await table.sync()
  }
  await addPNFColumnToTeacherTable()
  await updateSubjectProfileColumns()
  await updateTeacherRestrictionsColumns()
  await addIsPlaceholderColumnToTeacherTable()
  await updateScheduleConfigColumns()
  await addClassroomActiveColumn()
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
