import Subjects from '#models/subjects.js'
export async function getSimpleSubjectList () {
  try {
    return await Subjects.findAll({ raw: true })
  } catch (error) {
    console.error(error)
    return []
  }
}
