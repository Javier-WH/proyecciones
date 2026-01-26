/**
 * Este archivo es para realizar la coneccion a la base de datos con sequelize
 */
import dotenv from 'dotenv'
import { Sequelize } from 'sequelize'
dotenv.config()

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
    port: process.env.DB_PORT,
    logging: false
  }
)
try {
  await sequelize.authenticate()
  console.log('La base de datos se conecto correctamente')
} catch (error) {
  console.error('Unable to connect to the database:', error)
}

export default sequelize

export function closeConection () {
  sequelize.close()
  console.log('La base de datos se cerro correctamente')
}
