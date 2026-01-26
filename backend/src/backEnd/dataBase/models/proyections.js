import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Proyections extends Model {}
Proyections.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1900,
        max: 2300
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    subjects: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'proyections',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Proyections
