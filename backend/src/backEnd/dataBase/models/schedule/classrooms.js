import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Classrooms extends Model {}
Classrooms.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    classroom: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "classrooms",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Classrooms;

