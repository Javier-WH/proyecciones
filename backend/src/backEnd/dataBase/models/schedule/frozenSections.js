import sequelize from "#dataBaseConnection";
import { DataTypes, Model } from "sequelize";

class FrozenSections extends Model {}
FrozenSections.init(
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
    section_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Format: pnfId-trayectoId-seccion-trimestre",
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "Array of frozen Event objects for this section",
    },
  },
  {
    sequelize,
    modelName: "frozen_sections",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      {
        fields: ["proyection_id"],
        name: "frozen_sections_proyection_idx",
      },
      {
        unique: true,
        fields: ["proyection_id", "section_key"],
        name: "frozen_sections_proj_key_unique",
      },
    ],
  },
);

export default FrozenSections;
