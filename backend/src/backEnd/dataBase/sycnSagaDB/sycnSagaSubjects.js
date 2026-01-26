import fethSubjectAPI from '#fetch/fethSubjectsAPI.js'
import Subjects from '#models/subjects.js'

export default async function sycnSagaSubjects() {
  const sagaSubjects = await fethSubjectAPI({ pnfId: '', trayectoId: '', mayaId: '' })

  if (sagaSubjects === null) {
    console.log('No se han podido sincronizar las materias')
    return
  }

  const subjectList = sagaSubjects.map(item => item.description.trim())
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(subject => {
      return {
        id: crypto.randomUUID(),
        name: subject
      }
    })

  try {
    await Subjects.bulkCreate(subjectList, {
      fields: ['id', 'name'],
      updateOnDuplicate: ['name']
    })
    console.log('Materias sincronizadas')
  } catch (error) {
    console.log(error)
  }
}
