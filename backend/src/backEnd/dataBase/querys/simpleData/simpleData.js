import Gender from '#models/gender.js'
import ContractType from '#models/contractType.js'

export default async function getSimpleData (_, res) {
  try {
    const gender = await Gender.findAll({ raw: true })
    const contract = await ContractType.findAll({ raw: true })
    res.status(200).json({ gender, contract })
  } catch (error) {
    console.error(error)
    res.status(500).send('Ocurrió un error al obtener los datos')
  }
}
