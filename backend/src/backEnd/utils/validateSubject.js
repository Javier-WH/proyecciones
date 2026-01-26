import Joi from 'joi'

const hoursSchema = Joi.object({
  q1: Joi.number().optional().allow(null),
  q2: Joi.number().optional().allow(null),
  q3: Joi.number().optional().allow(null)
})

const quarterSchema = Joi.object({
  q1: Joi.string().uuid().optional().allow(null),
  q2: Joi.string().uuid().optional().allow(null),
  q3: Joi.string().uuid().optional().allow(null)
})

const subjectSchema = Joi.object({
  innerId: Joi.string().uuid().required(),
  id: Joi.string().uuid().required(),
  subject: Joi.string().required(),
  hours: hoursSchema.required(),
  pnf: Joi.string().required(),
  pnfId: Joi.string().uuid().required(),
  seccion: Joi.string().required(),
  quarter: quarterSchema.required(),
  pensum_id: Joi.string().uuid().required(),
  turnoName: Joi.string().required(),
  trayectoId: Joi.string().uuid().required(),
  trayectoName: Joi.string().required(),
  trayecto_saga_id: Joi.number().required()
})

const objectSchema = Joi.array().items(subjectSchema)

const validateSubjectData = (subject) => {
  return objectSchema.validate(subject)
}

export default validateSubjectData
