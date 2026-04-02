import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()
const TABLE_NAME = 'subjects_restrictions'
const UNIQUE_INDEX_NAME_OLD1 = 'subjects_restrictions_proyection_id_subject_key'
const UNIQUE_INDEX_NAME_OLD2 = 'subjects_restrictions_proyection_subject_key'
const UNIQUE_INDEX_NAME_OLD3 = 'subjects_restrictions_proj_subj_pnf_key'
const GLOBAL_UNIQUE_INDEX_NAME = 'subjects_restrictions_global_key'

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

    // await queryInterface.bulkDelete(TABLE_NAME, {}) // Removed to prevent data loss

    const tableInfo = await queryInterface.describeTable(TABLE_NAME)

    if (tableInfo.subject_id) {
      await queryInterface.removeColumn(TABLE_NAME, 'subject_id')
    }
    if (tableInfo.restrictions) {
      await queryInterface.removeColumn(TABLE_NAME, 'restrictions')
    }

    await ensureColumn(tableInfo, 'proyection_id', {
      type: DataTypes.UUID,
      allowNull: true
    })

    await ensureColumn(tableInfo, 'subject_key', {
      type: DataTypes.STRING(255),
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

    await ensureColumn(tableInfo, 'pnf_id', {
      type: DataTypes.UUID,
      allowNull: true
    })

    const indexes = await queryInterface.showIndex(TABLE_NAME)

    // Remover índices únicos viejos si existen
    const hasOldIndex1 = indexes.some((index) => index.name === UNIQUE_INDEX_NAME_OLD1)
    const hasOldIndex2 = indexes.some((index) => index.name === UNIQUE_INDEX_NAME_OLD2)

    if (hasOldIndex1) {
      await queryInterface.removeConstraint(TABLE_NAME, UNIQUE_INDEX_NAME_OLD1).catch(() => null)
      await queryInterface.removeIndex(TABLE_NAME, UNIQUE_INDEX_NAME_OLD1).catch(() => null)
    }
    if (hasOldIndex2) {
      await queryInterface.removeConstraint(TABLE_NAME, UNIQUE_INDEX_NAME_OLD2).catch(() => null)
      await queryInterface.removeIndex(TABLE_NAME, UNIQUE_INDEX_NAME_OLD2).catch(() => null)
    }

    const hasOldIndex3 = indexes.some((index) => index.name === UNIQUE_INDEX_NAME_OLD3)

    if (hasOldIndex3) {
      await queryInterface.removeConstraint(TABLE_NAME, UNIQUE_INDEX_NAME_OLD3).catch(() => null)
      await queryInterface.removeIndex(TABLE_NAME, UNIQUE_INDEX_NAME_OLD3).catch(() => null)
    }

    const refreshedIndexes = await queryInterface.showIndex(TABLE_NAME)
    const hasGlobalIndex = refreshedIndexes.some((index) => index.name === GLOBAL_UNIQUE_INDEX_NAME)

    if (!hasGlobalIndex) {
      await queryInterface.addIndex(TABLE_NAME, ['subject_key', 'pnf_id'], {
        unique: true,
        name: GLOBAL_UNIQUE_INDEX_NAME
      })
    }
  } catch (error) {
    console.error('Error al actualizar la tabla subjects_restrictions:', error)
  }
}
