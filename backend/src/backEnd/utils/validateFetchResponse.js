import Joi from 'joi'

const fetchResponse = Joi.object({
  error: Joi.boolean().required(),
  message: Joi.string().required().allow(null),
  data: Joi.object().required().allow(null)
})

const validateFetchResponse = (response) => {
  return fetchResponse.validate(response)
}

export default validateFetchResponse
