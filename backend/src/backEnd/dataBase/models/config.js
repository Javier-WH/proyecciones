import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Config extends Model {}
Config.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    active_proyection: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    }
  },
  {
    sequelize,
    modelName: 'configs',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Config
