import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()
const TABLE_NAME = 'subjects_restrictions'
const UNIQUE_INDEX_NAME = 'subjects_restrictions_proyection_subject_key'

async function ensureColumn (tableInfo, columnName, definition) {
  const exists = Boolean(tableInfo[columnName])
  if (!exists) {
    await queryInterface.addColumn(TABLE_NAME, columnName, definition)
  } else {
    await queryInterface.changeColumn(TABLE_NAME, columnName, definition)
  }
}

export default async function updateSubjectRestrictionsColumns () {
  try {
    const tableExists = await queryInterface.describeTable(TABLE_NAME).catch(() => null)
    if (!tableExists) {
      return
    }

    await queryInterface.bulkDelete(TABLE_NAME, {})

    const tableInfo = await queryInterface.describeTable(TABLE_NAME)

    if (tableInfo.subject_id) {
      await queryInterface.removeColumn(TABLE_NAME, 'subject_id')
    }
    if (tableInfo.restrictions) {
      await queryInterface.removeColumn(TABLE_NAME, 'restrictions')
    }

    await ensureColumn(tableInfo, 'proyection_id', {
      type: DataTypes.STRING(36),
      allowNull: false
    })

    await ensureColumn(tableInfo, 'subject_key', {
      type: DataTypes.STRING(36),
      allowNull: false
    })

    await ensureColumn(tableInfo, 'subject_name', {
      type: DataTypes.STRING,
      allowNull: false
    })

    await ensureColumn(tableInfo, 'classroom_ids', {
      type: DataTypes.JSON,
      allowNull: false
    })

    await ensureColumn(tableInfo, 'created_at', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    })

    await ensureColumn(tableInfo, 'updated_at', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    })

    const indexes = await queryInterface.showIndex(TABLE_NAME)
    const hasUniqueIndex = indexes.some((index) => index.name === UNIQUE_INDEX_NAME)

    if (!hasUniqueIndex) {
      await queryInterface.addIndex(TABLE_NAME, ['proyection_id', 'subject_key'], {
        unique: true,
        name: UNIQUE_INDEX_NAME
      })
    }
  } catch (error) {
    console.error('Error al actualizar la tabla subjects_restrictions:', error)
  }
}
