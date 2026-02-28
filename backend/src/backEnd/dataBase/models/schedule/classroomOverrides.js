import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class ClassroomOverrides extends Model {}
ClassroomOverrides.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    proyection_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "proyections",
        key: "id",
      },
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    day: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    end_time: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    classroom_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    seccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pnf_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    trayecto_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "classroom_overrides",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      {
        fields: ["proyection_id"],
        name: "classroom_overrides_proyection_idx",
      },
    ],
  },
);

export default ClassroomOverrides;

