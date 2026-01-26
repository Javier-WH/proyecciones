import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class ContractType extends Model { }
ContractType.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    contractType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    hours: {
      type: DataTypes.STRING,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'contract_types',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default ContractType
