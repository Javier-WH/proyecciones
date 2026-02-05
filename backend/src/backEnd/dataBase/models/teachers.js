import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class Teacher extends Model { }
Teacher.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ci: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    gender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "genders",
        key: "id",
      },
    },
    contractTypes_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "contract_types",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    perfil_name_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    PNF: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_placeholder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "teachers",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Teacher;

