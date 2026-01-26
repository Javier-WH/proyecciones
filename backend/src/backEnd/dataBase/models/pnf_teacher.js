import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Pnf_teacher extends Model {}
Pnf_teacher.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    teacher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "teachers",
        key: "id",
      },
    },
    pnf_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "pnfs",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "pnf_teacher",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Pnf_teacher;

