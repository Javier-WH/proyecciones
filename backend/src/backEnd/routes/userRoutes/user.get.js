import { getUserController, logoutUserController } from '#querys/user/userController.js'
import express from 'express'
import { validateLogedUser } from '#middlewares/middlewares.js'
const Router = express.Router()

Router.get('/user', validateLogedUser, getUserController)

Router.get('/logout', validateLogedUser, logoutUserController)

export default Router
