/* eslint-disable camelcase */
import Perfil from '#models/perfil.js'
import { v4 as uuidv4 } from 'uuid'
import { setTeacherList } from '../../../socket/socket.js'
import {
  generateSubjectProfileId,
  getSubjectProfileMaps,
  resolveSubjectMetadata
} from '#utils/subjectProfile.js'

export default async function addSubjectToProfile (req, res) {
  const { perfil_name_id, subject_id, subject_name } = req.body

  if (!perfil_name_id || !subject_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  try {
    const maps = await getSubjectProfileMaps()
    let metadata = resolveSubjectMetadata(subject_id, maps)

    if (!metadata.subjectName && subject_name) {
      metadata = {
        normalizedId: generateSubjectProfileId(subject_name),
        subjectName: subject_name,
        legacyId: metadata.legacyId
      }
    }

    if (!metadata.subjectName && !subject_name) {
      return res.status(400).json({
        error: 'No se pudo determinar el nombre de la materia. Verifique que exista en el catálogo.'
      })
    }

    const normalizedSubjectId = metadata.normalizedId || generateSubjectProfileId(subject_name) || subject_id
    const storedSubjectName = subject_name || metadata.subjectName || subject_id

    const id = uuidv4()
    await Perfil.create({
      id,
      perfil_name_id,
      subject_id: normalizedSubjectId,
      subject_name: storedSubjectName
    })

    // Actualizar la lista de profesores en el socket
    setTeacherList()
    res.status(201).json({ message: 'Materia agregada al perfil', subject_id: normalizedSubjectId })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Error al crear el perfil' })
  }
}
