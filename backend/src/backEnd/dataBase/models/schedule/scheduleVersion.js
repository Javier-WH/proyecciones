import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class ScheduleVersion extends Model {}
ScheduleVersion.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    row_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    proyection_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    trimestre: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    state_snapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    change_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'autosave',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "schedule_versions",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default ScheduleVersion;
