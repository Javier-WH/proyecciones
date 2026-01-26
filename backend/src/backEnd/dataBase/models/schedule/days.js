import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Days extends Model {}
Days.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    day: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "days",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Days;

