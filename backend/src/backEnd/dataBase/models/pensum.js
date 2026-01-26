import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Pensum extends Model { }
Pensum.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    pnf_id: {
      type: DataTypes.UUID,
      references: {
        model: 'pnfs',
        key: 'id'
      }
    },
    subject_id: {
      type: DataTypes.UUID,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    trayecto_id: {
      type: DataTypes.UUID,
      references: {
        model: 'trayectos',
        key: 'id'
      }
    },
    hours: {
      type: DataTypes.STRING
    },
    quarter: {
      type: DataTypes.JSON
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'pensums',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      {
        unique: true,
        fields: ['pnf_id', 'trayecto_id', 'subject_id']
      }
    ]
  }
)

export default Pensum
