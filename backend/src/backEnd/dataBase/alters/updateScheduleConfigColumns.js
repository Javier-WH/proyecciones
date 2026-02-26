import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'
const queryInterface = sequelize.getQueryInterface()

export default async function updateScheduleConfigColumns() {
  try {
    const tableInfo = await queryInterface.describeTable('schedule_configs').catch(() => null) ||
      await queryInterface.describeTable('schedule_config').catch(() => null);

    if (!tableInfo) {
      console.log("La tabla de configuración de horarios no existe todavía.");
      return;
    }

    const tableName = tableInfo.id ? (await queryInterface.describeTable('schedule_configs').catch(() => null) ? 'schedule_configs' : 'schedule_config') : 'schedule_configs';

    if (!tableInfo.header_text) {
      console.log(`Agregando columna 'header_text' a ${tableName}...`)
      await queryInterface.addColumn(tableName, 'header_text', {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: ["", "", "", ""]
      });
    }

    if (!tableInfo.logo_url) {
      console.log(`Agregando columna 'logo_url' a ${tableName}...`)
      await queryInterface.addColumn(tableName, 'logo_url', {
        type: DataTypes.TEXT('long'),
        allowNull: true
      });
    }

    console.log("Columnas de encabezado verificadas/agregadas exitosamente.");
  } catch (error) {
    console.error("Error al actualizar columnas de schedule_config:", error)
  }
}
