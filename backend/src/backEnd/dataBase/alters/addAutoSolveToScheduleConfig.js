import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()

export default async function addAutoSolveToScheduleConfig() {
  try {
    const tableInfo = await queryInterface.describeTable('schedule_configs')

    if (!tableInfo.auto_solve) {
      console.log("Adding 'auto_solve' column to 'schedule_configs' table...")
      await queryInterface.addColumn('schedule_configs', 'auto_solve', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
      console.log("Column 'auto_solve' added successfully.")
    } else {
      console.log("Column 'auto_solve' already exists in 'schedule_configs'.")
    }
  } catch (error) {
    console.error("Error adding 'auto_solve' folder:", error)
  }
}
