import sequelize from "#dataBaseConnection";
import { DataTypes } from "sequelize";
const queryInterface = sequelize.getQueryInterface();

export default async function addClassroomExclusiveColumn() {
  try {
    const tableInfo = await queryInterface.describeTable("classrooms");

    if (!tableInfo.exclusive) {
      console.log("La columna 'exclusive' no existe en la tabla 'classrooms'. Agregándola ahora...");

      await queryInterface.addColumn("classrooms", "exclusive", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });

      console.log("Columna 'exclusive' agregada exitosamente a la tabla 'classrooms'.");
    } else {
      console.log("La columna 'exclusive' ya existe en la tabla 'classrooms'. No se realizaron cambios.");
    }
  } catch (error) {
    console.error("Error al verificar o agregar la columna 'exclusive' en la tabla 'classrooms':", error);
  }
}

