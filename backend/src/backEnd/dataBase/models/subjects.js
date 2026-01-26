import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Subjects extends Model { }
Subjects.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: 'unique_name',
        collate: 'utf8mb4_0900_ai_ci'
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'subjects',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Subjects
