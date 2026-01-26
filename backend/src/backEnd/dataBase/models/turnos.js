import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Turnos extends Model { }
Turnos.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    saga_id: {
      type: DataTypes.BIGINT
    }
  },
  {
    sequelize,
    modelName: 'turnos',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Turnos
