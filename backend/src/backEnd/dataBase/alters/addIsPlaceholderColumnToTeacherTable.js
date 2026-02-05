import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'
const queryInterface = sequelize.getQueryInterface()

export default async function addIsPlaceholderColumnToTeacherTable() {
    try {
        const tableInfo = await queryInterface.describeTable('teachers')

        // Verifica si la columna 'is_placeholder' ya existe en la tabla
        if (!tableInfo.is_placeholder) {
            console.log("La columna 'is_placeholder' no existe. Agregándola ahora...")

            await queryInterface.addColumn('teachers', 'is_placeholder', {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            })

            console.log("Columna 'is_placeholder' agregada exitosamente.")
        } else {
            console.log("La columna 'is_placeholder' ya existe. No se realizaron cambios.")
        }
    } catch (error) {
        console.error("Error al verificar o agregar la columna 'is_placeholder':", error)
    }
}
