import addSubjectToProfile from '#querys/profile/addSubjectToPerfil.js'
import deleteProfile from '#querys/profile/deleteProfile.js'
import deleteSubjectInProfile from '#querys/profile/deleteSubjectInProfile.js'
import getProfile from '#querys/profile/getProfile.js'
import getProfileById from '#querys/profile/getProfileById.js'
import getPerfilNames from '#querys/profile/getProfileNames.js'
import setProfile from '#querys/profile/postProfile.js'
import express from 'express'
const Router = express.Router()

Router.get('/profiles', async (_, res) => {
  const profiles = await getProfile()
  res.json(profiles)
})

Router.get('/profile/:id', getProfileById)

Router.get('/profileNames', async (_, res) => {
  const profileNames = await getPerfilNames()
  res.json(profileNames)
})

Router.post('/profile', express.json(), async (req, res) => {
  const response = await setProfile(req.body)
  res.send(response)
})

Router.post('/profile/addSubject', express.json(), addSubjectToProfile)

Router.delete('/profile/:perfil_name_id', deleteProfile)

Router.delete('/subjectinprofile/:id', deleteSubjectInProfile)

export default Router
