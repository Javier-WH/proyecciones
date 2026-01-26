import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Trayecto extends Model { }
Trayecto.init(
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
    },
    order: {
      type: DataTypes.INTEGER,
      unique: true
    }
  },
  {
    sequelize,
    modelName: 'trayectos',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Trayecto
