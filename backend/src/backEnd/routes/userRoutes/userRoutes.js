import express from 'express'
import userGet from './user.get.js'
import userPost from './user.post.js'
import userDelete from './user.delete.js'
import userPut from './user.put.js'
const Router = express.Router()

Router.use(userGet)
Router.use(userPost)
Router.use(userDelete)
Router.use(userPut)

export default Router
