import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'
const queryInterface = sequelize.getQueryInterface()

export default async function addEmailColumnToTeacherTable() {
  try {
    const tableInfo = await queryInterface.describeTable('teachers')

    // Verifica si la columna 'email' ya existe en la tabla
    if (!tableInfo.email) {
      console.log("La columna 'email' no existe. Agregándola ahora...")

      await queryInterface.addColumn('teachers', 'email', {
        type: DataTypes.STRING,
        allowNull: true,
      })

      console.log("Columna 'email' agregada exitosamente.")
    } else {
      console.log("La columna 'email' ya existe. No se realizaron cambios.")
    }
  } catch (error) {
    console.error("Error al verificar o agregar la columna 'email':", error)
  }
}
