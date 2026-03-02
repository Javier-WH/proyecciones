import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const addBreaksToScheduleConfig = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface()
    const table = 'schedule_configs'

    // Check if table exists
    const tableExists = await queryInterface.tableExists(table)
    if (!tableExists) {
      console.log(`Table ${table} does not exist. Skipping alter.`)
      return
    }

    const tableDescription = await queryInterface.describeTable(table)

    if (!tableDescription.breaks) {
      await queryInterface.addColumn(table, 'breaks', {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      })
      console.log('Column "breaks" added to schedule_configs table.')
    } else {
      console.log('Column "breaks" already exists in schedule_configs table.')
    }

  } catch (error) {
    console.error('Error altering schedule_configs table:', error)
  }
}

export default addBreaksToScheduleConfig
