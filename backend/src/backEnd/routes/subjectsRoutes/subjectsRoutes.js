import deletePensum from '#querys/subjects/deletePensum.js'
import { getSimpleSubjectList } from '#querys/subjects/getSimpleSubjectList.js'
import postPensum from '#querys/subjects/postPensum.js'
import postSubject from '#querys/subjects/postSubject.js'
import express from 'express'
import { validateAdminUser } from '#middlewares/middlewares.js'
const Router = express.Router()

Router.get('/subjects', async (_, res) => {
  const subjects = await getSimpleSubjectList()
  res.json(subjects)
})

Router.post('/subject', validateAdminUser, express.json(), postSubject)

Router.post('/pensum', validateAdminUser, express.json(), postPensum)

Router.delete('/pensum/:id', validateAdminUser, deletePensum)

export default Router
