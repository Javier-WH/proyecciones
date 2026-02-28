import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class SubjectRestrictions extends Model {}
SubjectRestrictions.init(
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
    subject_key: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classroom_ids: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    pnf_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_exclusive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    split_hours: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "subjects_restrictions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      {
        unique: true,
        fields: ["proyection_id", "subject_key", "pnf_id"],
        name: "subjects_restrictions_proj_subj_pnf_key",
      },
    ],
  },
);

export default SubjectRestrictions;

