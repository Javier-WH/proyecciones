import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()

export default async function addStageToLockedSections() {
  try {
    const tableInfo = await queryInterface.describeTable('frozen_sections')

    if (!tableInfo.stage) {
      console.log("Adding 'stage' column to 'frozen_sections' table...")
      await queryInterface.addColumn('frozen_sections', 'stage', {
        type: DataTypes.ENUM('planning', 'official'),
        allowNull: false,
        defaultValue: 'planning'
      })
      console.log("Column 'stage' added successfully to 'frozen_sections' table.")
    } else {
      console.log("Column 'stage' already exists in 'frozen_sections' table.")
    }
  } catch (error) {
    // Table might not exist yet, which is fine
    if (error.name === 'SequelizeDatabaseError' && error.original?.code === 'ER_NO_SUCH_TABLE') {
      console.log("Table 'frozen_sections' does not exist yet. Skipping migration.")
    } else {
      console.error("Error adding 'stage' column to 'frozen_sections':", error)
    }
  }
}
