import fetchTeachers from '#fetch/fetchTeachersAPI.js'
import Teacher from '#models/teachers.js'
import Gender from '#models/gender.js'

import { v4 as uuidv4 } from 'uuid'

export default async function sycnSagaTeachers() {
  const sagaTeachers = await fetchTeachers()

  if (sagaTeachers === null) {
    console.log('No se han podido sincronizar los profesores')
    return
  }

  const genderList = await Gender.findAll({ raw: true })

  const femenino = genderList.find((gender) => gender.name === 'Femenino')?.id
  const masculino = genderList.find((gender) => gender.name === 'Masculino')?.id

  // Obtener los profesores actuales para no cambiar sus IDs
  const existingTeachers = await Teacher.findAll({ raw: true })
  const ciToIdMap = new Map()
  existingTeachers.forEach((t) => ciToIdMap.set(t.ci, t.id))

  const teachersList = sagaTeachers.map((SagaTeacher) => {
    let email = SagaTeacher.email1?.trim() || SagaTeacher.email2?.trim() || null;
    if (email === '') email = null;

    return {
      id: ciToIdMap.get(SagaTeacher.CedulaProfesor) || uuidv4(),
      name: SagaTeacher.NombreProfesor,
      last_name: SagaTeacher.ApellidoProfesor,
      ci: SagaTeacher.CedulaProfesor,
      gender_id: SagaTeacher.sexo === 'M' ? masculino : femenino,
      contractTypes_id: null,
      title: 'Profesor',
      perfil_name_id: null,
      active: true,
      email: email,
    }
  })

  try {
    await Teacher.bulkCreate(teachersList, {
      fields: [
        'id',
        'name',
        'last_name',
        'ci',
        'gender_id',
        'contractTypes_id',
        'title',
        'perfil_name_id',
        'active',
        'email'
      ],
      updateOnDuplicate: ['name', 'last_name', 'email']
    })
    console.log('Profesores sincronizados')
  } catch (error) {
    console.log(error)
  }
}
