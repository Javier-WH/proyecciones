import { updateUserController } from '#querys/user/userController.js'
import express from 'express'
import { validateAdminUser } from '#middlewares/middlewares.js'
const Router = express.Router()

Router.put('/user', validateAdminUser, express.json(), updateUserController)

export default Router
