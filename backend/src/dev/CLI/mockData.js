import { Op } from 'sequelize'
import Contracts from '../../backEnd/dataBase/models/contractType.js'
import Pnf from '../../backEnd/dataBase/models/pnf.js'
import Subject from '../../backEnd/dataBase/models/subjects.js'
import PerfilNames from '../../backEnd/dataBase/models/perfilNames.js'
import Pesum from '../../backEnd/dataBase/models/pensum.js'
import Perfil from '../../backEnd/dataBase/models/perfil.js'
import Teacher from '../../backEnd/dataBase/models/teachers.js'
import Gender from '../../backEnd/dataBase/models/gender.js'
import { getRandomNumber } from '../../backEnd/utils/utils.js'

// mock data
import teachers from './placeHolders/teachersMockData.js'
import gender from './placeHolders/genderMockData.js'
import contract from './placeHolders/contractMockData.js'
import pnf from './placeHolders/pnfMockData.js'
import subject from './placeHolders/subjectMockData.js'
import perfil from './placeHolders/perfilMockData.js'

export async function generateGenderData () {
  try {
    const genders = await Gender.findAll()
    if (genders.length !== 0) return
    await Gender.bulkCreate(gender)
    console.log('Generos creados')
  } catch (error) {
    console.log(error)
  }
}

export async function generateContractsData () {
  try {
    const contacts = await Contracts.findAll()
    if (contacts.length !== 0) return
    await Contracts.bulkCreate(contract)
    console.log('Tipos de contratos creados')
  } catch (error) {
    console.log(error)
  }
}

export async function generatePnfData () {
  try {
    const pnfs = await Pnf.findAll()
    if (pnfs.length !== 0) return
    await Pnf.bulkCreate(pnf)
    console.log('Pnfs creados')
  } catch (error) {
    console.log(error)
  }
}

export async function generateSubjectsData () {
  try {
    const subjetcs = await Subject.findAll()
    if (subjetcs.length !== 0) return
    await Subject.bulkCreate(subject)
    console.log('Materias creadas')
  } catch (error) {
    console.log(error)
  }
}

export async function generatePerfilsData () {
  try {
    const perfilNames = await PerfilNames.findAll()
    if (perfilNames.length !== 0) return
    await PerfilNames.bulkCreate(perfil)
    console.log('Nombres de perfiles creados')
  } catch (error) {
    console.log(error)
  }
}

export async function generatePesumData () {
  try {
    const pensums = await Pesum.findAll()
    if (pensums.length !== 0) return

    const subjectsId = await Subject.findAll({ attributes: ['id'], raw: true })
    const addSubjects = subjectsId.map((subject) => {
      return {
        id: crypto.randomUUID(),
        subject_id: subject.id
      }
    })

    const pnfID = await Pnf.findAll({ attributes: ['id'], raw: true })
    const addPnf = addSubjects.map((subject) => {
      subject.pnf_id = pnfID[Math.floor(Math.random() * pnfID.length)].id
      return subject
    })

    const pensumData = addPnf.map((subject) => {
      const quarterTypes = [[1, 2, 3], [1], [2], [3], [1, 2], [2, 3]]
      const quarter = quarterTypes[Math.floor(Math.random() * quarterTypes.length)]
      subject.quarter = JSON.stringify(quarter)
      subject.hours = getRandomNumber(6, 18)
      return subject
    })

    await Pesum.bulkCreate(pensumData)
    console.log('Pensums creados')
  } catch (error) {
    console.log(error)
  }
}

export async function generatePerfilData () {
  try {
    const perlis = await Perfil.findAll()
    if (perlis.length !== 0) return

    const subjectsId = await Subject.findAll({ attributes: ['id'], raw: true })
    const addSubjects = subjectsId.map((subject) => {
      return {
        id: crypto.randomUUID(),
        subject_id: subject.id
      }
    })

    const perfilNamesID = await PerfilNames.findAll({ attributes: ['id'], raw: true })
    const perfilNames = addSubjects.map((perfil) => {
      perfil.perfil_name_id = perfilNamesID[Math.floor(Math.random() * perfilNamesID.length)].id
      return perfil
    })
    await Perfil.bulkCreate(perfilNames)
    console.log('Perfiles creados')
  } catch (error) {
    console.log(error)
  }
}

export async function generateTeachesData () {
  try {
    const _teachers = await Teacher.findAll()
    if (_teachers.length !== 0) return

    const contractTypesID = await Contracts.findAll({ attributes: ['id'], raw: true })
    const perfilsNamesID = await Perfil.findAll({ attributes: ['perfil_name_id'], raw: true })
    const gendersID = await Gender.findAll({ attributes: ['id'], raw: true })
    const teachersData = teachers.map((teacher) => {
      teacher.contractTypes_id = contractTypesID[Math.floor(Math.random() * contractTypesID.length)].id
      teacher.perfil_name_id =
        perfilsNamesID[Math.floor(Math.random() * perfilsNamesID.length)].perfil_name_id
      teacher.gender_id = gendersID[Math.floor(Math.random() * gendersID.length)].id
      return teacher
    })
    await Teacher.bulkCreate(teachersData)
    console.log('Profesores creados')
  } catch (error) {
    console.log(error)
  }
}

export async function deleData () {
  try {
    await Teacher.destroy({ where: { id: { [Op.ne]: null } } })
    await Perfil.destroy({ where: { id: { [Op.ne]: null } } })
    await PerfilNames.destroy({ where: { id: { [Op.ne]: null } } })
    await Pesum.destroy({ where: { id: { [Op.ne]: null } } })
    await Pnf.destroy({ where: { id: { [Op.ne]: null } } })
    await Gender.destroy({ where: { id: { [Op.ne]: null } } })
    await Subject.destroy({ where: { id: { [Op.ne]: null } } })
    await PerfilNames.destroy({ where: { id: { [Op.ne]: null } } })
    await Contracts.destroy({ where: { id: { [Op.ne]: null } } })
  } catch (error) {
    console.log(error)
  }
}
export async function mockData () {
  const flags = process.argv
  if (flags.includes('-force')) {
    await deleData()
  }
  await generateGenderData()
  await generateContractsData()
  await generatePnfData()
  await generateSubjectsData()
  await generatePerfilsData()
  await generatePesumData()
  await generatePerfilData()
  // await generateTeachesData()
}

mockData()
