import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'
const queryInterface = sequelize.getQueryInterface()

export default async function addPNFColumnToTeacherTable () {
  try {
    const tableInfo = await queryInterface.describeTable('teachers')

    // Verifica si la columna 'PNF' ya existe en la tabla
    if (!tableInfo.PNF) {
      console.log("La columna 'PNF' no existe. Agregándola ahora...")

      await queryInterface.addColumn('teachers', 'PNF', {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
      })

      console.log("Columna 'PNF' agregada exitosamente.")
    } else {
      console.log("La columna 'PNF' ya existe. No se realizaron cambios.")
    }
  } catch (error) {
    console.error("Error al verificar o agregar la columna 'PNF':", error)
  }
}
