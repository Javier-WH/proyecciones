import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Pnf extends Model {}
Pnf.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    saga_id: {
      type: DataTypes.BIGINT,
    },
    color: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    modelName: "pnfs",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Pnf;

