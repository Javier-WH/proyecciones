import { deleteUserController } from '#querys/user/userController.js'
import express from 'express'
const Router = express.Router()

Router.delete('/user', express.json(), deleteUserController)

export default Router
