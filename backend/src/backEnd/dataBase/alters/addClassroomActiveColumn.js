import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'
const queryInterface = sequelize.getQueryInterface()

export default async function addClassroomActiveColumn() {
  try {
    const tableInfo = await queryInterface.describeTable('classrooms')

    if (!tableInfo.active) {
      console.log("La columna 'active' no existe en la tabla 'classrooms'. Agregándola ahora...")

      await queryInterface.addColumn('classrooms', 'active', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      })

      console.log("Columna 'active' agregada exitosamente a la tabla 'classrooms'.")
    } else {
      console.log("La columna 'active' ya existe en la tabla 'classrooms'. No se realizaron cambios.")
    }
  } catch (error) {
    console.error("Error al verificar o agregar la columna 'active' en la tabla 'classrooms':", error)
  }
}
