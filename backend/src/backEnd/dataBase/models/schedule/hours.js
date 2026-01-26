import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Hours extends Model {}
Hours.init(
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
    hours: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "hours",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Hours;

