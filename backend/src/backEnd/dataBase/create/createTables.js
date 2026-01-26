import tableList from './tables.js'
import addPNFColumnToTeacherTable from '../alters/addPNFColumnToTeacherTable.js'
import updateSubjectProfileColumns from '../alters/updateSubjectProfileColumns.js'
import updateTeacherRestrictionsColumns from '../alters/updateTeacherRestrictionsColumns.js'
import updateSubjectRestrictionsColumns from '../alters/updateSubjectRestrictionsColumns.js'

export const createTables = async () => {
  await updateSubjectRestrictionsColumns()
  for (const table of tableList) {
    await table.sync()
  }
  await addPNFColumnToTeacherTable()
  await updateSubjectProfileColumns()
  await updateTeacherRestrictionsColumns()
}

export const dropTables = async () => {
  for (const table of [...tableList].reverse()) {
    await table.drop()
  }
}
