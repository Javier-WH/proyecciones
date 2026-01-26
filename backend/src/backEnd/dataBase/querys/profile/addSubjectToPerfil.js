/* eslint-disable camelcase */
import Perfil from '#models/perfil.js'
import { v4 as uuidv4 } from 'uuid'
import { setTeacherList } from '../../../socket/socket.js'
import {
  generateSubjectProfileId,
  getSubjectProfileMaps,
  resolveSubjectMetadata
} from '#utils/subjectProfile.js'

export default async function addSubjectToProfile(req, res) {
  const { perfil_name_id, subject_id, subject_name } = req.body

  if (!perfil_name_id || !subject_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  try {
    const id = uuidv4()
    await Perfil.create({
      id,
      perfil_name_id,
      subject_id,
      subject_name
    })

    // Actualizar la lista de profesores en el socket
    setTeacherList()
    res.status(201).json({ message: 'Materia agregada al perfil', subject_id })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Error al crear el perfil' })
  }
}
