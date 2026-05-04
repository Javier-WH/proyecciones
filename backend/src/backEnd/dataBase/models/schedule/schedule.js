import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Schedule extends Model { }
Schedule.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
    },
    schedule: {
      type: DataTypes.TEXT('long'),
    },
    proyection_id: {
      type: DataTypes.UUID,
      references: {
        model: "proyections",
        key: "id",
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    staged: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    state_snapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "schedules",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Schedule;

