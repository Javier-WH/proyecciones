/* eslint-disable camelcase */
import { validateCreateUserData, validateLoginUserData } from './validateUserData.js'
import Users from '#models/users.js'
import Pensum from '#models/pensum.js'
import { createUser } from './userAux/userAux.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import {
  getSubjectProfileMaps,
  resolveSubjectMetadata
} from '#utils/subjectProfile.js'

const saltRounds = 10

export async function createUserController (req, res) {
  const { error, value } = validateCreateUserData(req.body)

  if (error) {
    return res.status(400).json({ error: error.details[0].message })
  }

  try {
    value.id = uuidv4()
    value.password = bcrypt.hashSync(value.password, saltRounds)
    const request = await createUser(value)
    if (request.error) {
      return res.status(400).json({ error: request.message })
    }
    res.status(200).json({ message: 'Usuario creado exitosamente' })
  } catch (error) {
    res.status(500).json({ error })
  }
}

export async function loginUserController (req, res) {
  const { error, value } = validateLoginUserData(req.body)

  if (error) {
    return res.status(400).json({ error: error.details[0].message })
  }

  try {
    const user = await Users.findOne({
      where: {
        user: value.user
      }
    })
    if (!user) {
      return res.status(401).json({ error: 'El usuario no está registrado' })
    }

    if (!bcrypt.compareSync(value.password, user.password)) {
      return res.status(401).json({ error: 'La contraseña es incorrecta' })
    }

    const { pnf_id, name, last_name, ci, su, id } = user

    const userData = {
      name: `${name} ${last_name}`,
      ci,
      su
    }

    req.session.user = {
      pnf_id,
      name,
      last_name,
      ci,
      su,
      id
    }

    req.session.save(async (err) => {
      if (err) {
        console.error('Error saving session:', err)
        return res.status(500).json({ error: 'Error al guardar la sesión' })
      }

      const requestPensum = await Pensum.findAll({
        attributes: ['subject_id'],
        where: { pnf_id },
        raw: true
      })

      const maps = await getSubjectProfileMaps()
      const perfilRecords = requestPensum.map((item) => {
        const metadata = resolveSubjectMetadata(item.subject_id, maps)
        const normalizedId = metadata.normalizedId || item.subject_id

        return {
          subject_id: normalizedId,
          subject_name: metadata.subjectName || item.subject_id,
          legacy_subject_id:
            metadata.legacyId && metadata.legacyId !== normalizedId
              ? metadata.legacyId
              : null
        }
      })

      const perfil = [...new Set(perfilRecords.map((record) => record.subject_id))]
      res.status(200).json({
        message: 'Inicio de sesión exitoso',
        pnf_id,
        perfil,
        userPerfil: perfilRecords,
        userData
      })
    })

    /*  const requestPensum = await Pensum.findAll({ attributes: ['subject_id'], where: { pnf_id }, raw: true })
    const perfil = requestPensum.map((item) => item.subject_id)

    res.status(200).json({ message: 'Inicio de sesión exitoso', pnf_id, perfil, userData }) */
  } catch (error) {
    res.status(500).json({ error })
  }
}

export const logoutUserController = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar la sesión' })
    }

    res.status(200).json({ message: 'Sesión cerrada exitosamente' })
  })
}

export async function getUserController (req, res) {
  const { ci } = req.query

  if (!ci) {
    return res.status(400).json({ error: 'La cédula es requerida' })
  }

  try {
    const user = await Users.findOne({
      where: { ci },
      attributes: ['id', 'user', 'name', 'last_name', 'ci', 'su', 'pnf_id']
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el usuario' })
  }
}

export async function getAllUsersController (req, res) {
  try {
    const users = await Users.findAll({
      attributes: ['id', 'user', 'name', 'last_name', 'ci', 'su', 'pnf_id'],
      order: [['name', 'ASC']]
    })
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los usuarios' })
  }
}

export async function updateUserController (req, res) {
  const { name, last_name, ci, user, password, su, pnf_id } = req.body

  if (!ci) {
    return res.status(400).json({ error: 'La cédula es requerida' })
  }

  const data = {}

  if (name) data.name = name
  if (last_name) data.last_name = last_name
  if (user) data.user = user
  if (password) data.password = bcrypt.hashSync(password, saltRounds)
  if (su) data.su = su
  if (pnf_id) data.pnf_id = pnf_id

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' })
  }

  try {
    const user = await Users.findOne({
      where: { ci },
      attributes: ['id', 'user', 'name', 'last_name', 'ci', 'su', 'pnf_id']
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    await Users.update(data, { where: { ci } })

    res.status(200).json({ message: 'Usuario actualizado exitosamente' })
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el usuario' })
  }
}

export async function deleteUserController (req, res) {
  const { ci } = req.body
  if (!ci) {
    return res.status(400).json({ error: 'La cédula es requerida' })
  }

  try {
    const user = await Users.findOne({
      where: { ci },
      attributes: ['id', 'user', 'name', 'last_name', 'ci', 'su', 'pnf_id']
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    await Users.destroy({ where: { ci } })

    res.status(200).json({ message: 'Usuario eliminado exitosamente' })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el usuario' })
  }
}
