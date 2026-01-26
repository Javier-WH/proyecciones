import { getContractTypes, updateContractType } from '#querys/Contracts/Contracts.js'
import express from 'express'
import { validateAdminUser } from '#middlewares/middlewares.js'
const Router = express.Router()

Router.get('/contractTypes', getContractTypes)

Router.put('/contractType', validateAdminUser, express.json(), updateContractType)

export default Router
