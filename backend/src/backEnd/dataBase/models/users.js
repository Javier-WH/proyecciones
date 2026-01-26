import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class Users extends Model { }
Users.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ci: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    user: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pnf_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    su: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: 'users',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)

export default Users
