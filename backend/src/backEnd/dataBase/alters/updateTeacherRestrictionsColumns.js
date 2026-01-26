import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()

export default async function updateTeacherRestrictionsColumns () {
  try {
    const tableInfo = await queryInterface.describeTable('teachers_restrictions')

    if (!tableInfo?.restricted_days) {
      console.log("Agregando columna 'restricted_days' a 'teachers_restrictions'...")
      await queryInterface.addColumn('teachers_restrictions', 'restricted_days', {
        type: DataTypes.JSON,
        allowNull: true
      })
    }

    if (!tableInfo?.restricted_hours) {
      console.log("Agregando columna 'restricted_hours' a 'teachers_restrictions'...")
      await queryInterface.addColumn('teachers_restrictions', 'restricted_hours', {
        type: DataTypes.JSON,
        allowNull: true
      })
    }

    if (tableInfo?.restrictions && tableInfo.restrictions.allowNull === false) {
      console.log("Actualizando columna 'restrictions' para permitir valores nulos...")
      await queryInterface.changeColumn('teachers_restrictions', 'restrictions', {
        type: DataTypes.TEXT,
        allowNull: true
      })
    }
  } catch (error) {
    console.error('Error al actualizar la tabla teachers_restrictions:', error)
  }
}
