import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'
const queryInterface = sequelize.getQueryInterface()

export default async function updateScheduleColumnTextToLong() {
    try {
        const tableInfo = await queryInterface.describeTable('schedules')

        if (tableInfo && tableInfo.schedule) {
            if (tableInfo.schedule.type !== 'LONGTEXT') {
                console.log("Modificando la columna 'schedule' en la tabla 'schedules' a LONGTEXT...")

                await queryInterface.changeColumn('schedules', 'schedule', {
                    type: DataTypes.TEXT('long'),
                    allowNull: true,
                })

                console.log("Columna 'schedule' modificada a LONGTEXT exitosamente.")
            } else {
                console.log("La columna 'schedule' ya es LONGTEXT. No se realizaron cambios.")
            }
        }
    } catch (error) {
        if (error.message && error.message.includes("No description found for")) {
            // Table probably doesn't exist yet, which is fine during initial sync
            return;
        }
        console.error("Error al modificar la columna 'schedule':", error)
    }
}
