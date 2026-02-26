import sequelize from "../connection/ORMconnection.js";

export default async function addIsExclusiveToSubjectRestrictions() {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "subjects_restrictions";

  try {
    const tableInfo = await queryInterface.describeTable(tableName);

    if (!tableInfo.is_exclusive) {
      console.log(`Adding 'is_exclusive' column to '${tableName}' table...`);
      await queryInterface.addColumn(tableName, "is_exclusive", {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log(`Column 'is_exclusive' added successfully.`);
    } else {
      console.log(`Column 'is_exclusive' already exists in '${tableName}' table.`);
    }
  } catch (error) {
    console.error(`Error altering '${tableName}' table:`, error);
  }
}
