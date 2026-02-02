import express from 'express'
import {
    getScheduleConfig,
    createScheduleConfig,
    updateScheduleConfig,
    deleteScheduleConfig
} from '../../controllers/schedule/scheduleConfigController.js'

const Router = express.Router()

Router.get('/schedule-config', getScheduleConfig)
Router.post('/schedule-config', express.json(), createScheduleConfig)
Router.put('/schedule-config/:id', express.json(), updateScheduleConfig)
Router.delete('/schedule-config/:id', deleteScheduleConfig)

export default Router
