import Joi from 'joi'

export const validateCreateUserData = (user) => {
  const userSchema = Joi.object({
    // id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    last_name: Joi.string().required(),
    ci: Joi.number().required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
    pnf_id: Joi.string().uuid().required(),
    su: Joi.boolean().required()
  })
  return userSchema.validate(user)
}

export const validateLoginUserData = (user) => {
  const userSchema = Joi.object({
    user: Joi.string().required(),
    password: Joi.string().required()
  })
  return userSchema.validate(user)
}
