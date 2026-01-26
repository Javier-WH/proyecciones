import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Perfil extends Model {}
Perfil.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    perfil_name_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'perfil_names',
        key: 'id'
      }
    },
    subject_id: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'perfiles',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Perfil
