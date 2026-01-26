import { createUserController, loginUserController } from '#querys/user/userController.js'
import { validateAdminUser } from '#middlewares/middlewares.js'

import express from 'express'
const Router = express.Router()

Router.post('/login', express.json(), loginUserController)

Router.post('/user', validateAdminUser, express.json(), createUserController)

export default Router
