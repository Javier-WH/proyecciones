import sequelize from "../connection/ORMconnection.js";

export default async function addSplitHoursToSubjectRestrictions() {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "subjects_restrictions";

  try {
    const tableInfo = await queryInterface.describeTable(tableName);

    if (!tableInfo.split_hours) {
      console.log(`Adding 'split_hours' column to '${tableName}' table...`);
      await queryInterface.addColumn(tableName, "split_hours", {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log(`Column 'split_hours' added successfully.`);
    } else {
      console.log(`Column 'split_hours' already exists in '${tableName}' table.`);
    }
  } catch (error) {
    console.error(`Error altering '${tableName}' table:`, error);
  }
}

