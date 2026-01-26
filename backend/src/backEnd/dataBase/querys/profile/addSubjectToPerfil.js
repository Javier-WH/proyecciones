/* eslint-disable camelcase */
import Perfil from '#models/perfil.js'
import { v4 as uuidv4 } from 'uuid'
import { setTeacherList } from '../../../socket/socket.js'
import { generateSubjectProfileId } from '#utils/subjectProfile.js'

export default async function addSubjectToProfile(req, res) {
  const { perfil_name_id, subject_id, subject_name } = req.body

  if (!perfil_name_id || (!subject_id && !subject_name)) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  try {
    const id = uuidv4()

    // Use the name to generate the normalized ID if available, otherwise fallback to subject_id
    const nameToUse = subject_name || subject_id
    const normalizedSubjectId = generateSubjectProfileId(nameToUse)

    await Perfil.create({
      id,
      perfil_name_id,
      subject_id: normalizedSubjectId,
      subject_name: nameToUse
    })

    // Actualizar la lista de profesores en el socket
    setTeacherList()
    res.status(201).json({ message: 'Materia agregada al perfil', subject_id: normalizedSubjectId })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Error al crear el perfil' })
  }
}
