import getSimpleData from '#querys/simpleData/simpleData.js'
import express from 'express'
const Router = express.Router()

Router.get('/simpleData', getSimpleData)

export default Router
