import validator from 'validate.js';

const redirectlessConfigValidator = (configuration) => {
  if (validator.isEmpty(configuration)) {
    throw new Error('configuration argument is required.');
  }

  const onAuthorizationSuccess = configuration.onAuthorizationSuccess;
  if (validator.isEmpty(onAuthorizationSuccess)) {
    throw new Error('onAuthorizationSuccess attribute is required.');
  }
  if (!validator.isFunction(onAuthorizationSuccess)) {
    throw new Error('onAuthorizationSuccess attribute must be a function.');
  }

  const onGetFlowId = configuration.onGetFlowId;
  const onGetFlowIdIsPresent = !validator.isEmpty(onGetFlowId)
  if (onGetFlowIdIsPresent) {
    validateWithOnGetFlowId(onGetFlowId)
  } else {
    validateWithoutOnGetFlowId(configuration);
  }
}

const validateWithOnGetFlowId = (onGetFlowId) => {
  if (!validator.isFunction(onGetFlowId)) {
    throw new Error('onGetFlowId attribute must be a function.');
  }
}

const validateWithoutOnGetFlowId = (configuration) => {
  // validate client_id
  const clientId = configuration.client_id;
  if (validator.isEmpty(clientId)) {
    throw new Error('client_id attribute is required')
  } else {
    if (!validator.isString(clientId)) {
      throw new Error('client_id attribute must be a string.')
    }
  }

  // validate response_type
  const responseType = configuration.response_type;
  if (validator.isEmpty(responseType)) {
    throw new Error('response_type attribute is required')
  } else {
    if (!validator.isString(responseType)) {
      throw new Error('response_type attribute must be a string.')
    }
  }
}

export default redirectlessConfigValidator