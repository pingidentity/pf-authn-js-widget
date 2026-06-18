import validator from 'validate.js';
import { isUserAuthzFlowType, isAuthzFlowType, type RedirectlessConfig } from '../utils/redirectless';

const redirectlessConfigValidator = (configuration: RedirectlessConfig): void => {
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

  if (configuration.onAuthorizationFailed) {
    const onAuthorizationFailed = configuration.onAuthorizationFailed;
    if (!validator.isFunction(onAuthorizationFailed)) {
      throw new Error('onAuthorizationFailed attribute must be a function.');
    }
  }

  const onAuthorizationRequest = configuration.onAuthorizationRequest;
  const onAuthorizationRequestIsPresent = !validator.isEmpty(onAuthorizationRequest);
  if (onAuthorizationRequestIsPresent) {
    validateWithOnAuthorizationRequest(onAuthorizationRequest);
  } else {
    if (isUserAuthzFlowType(configuration)) {
      return;
    } else if (isAuthzFlowType(configuration)) {
      validateWithoutOnAuthorizationRequest(configuration);
    } else {
      throw new Error('Invalid flow type');
    }
  }
};

const validateWithOnAuthorizationRequest = (
  onAuthorizationRequest: RedirectlessConfig['onAuthorizationRequest']
): void => {
  if (!validator.isFunction(onAuthorizationRequest)) {
    throw new Error('onAuthorizationRequest attribute must be a function.');
  }
};

const validateWithoutOnAuthorizationRequest = (configuration: RedirectlessConfig): void => {
  const clientId = configuration.client_id;
  if (validator.isEmpty(clientId)) {
    throw new Error('client_id attribute is required');
  } else {
    if (!validator.isString(clientId)) {
      throw new Error('client_id attribute must be a string.');
    }
  }

  const responseType = configuration.response_type;
  if (validator.isEmpty(responseType)) {
    throw new Error('response_type attribute is required');
  } else {
    if (!validator.isString(responseType)) {
      throw new Error('response_type attribute must be a string.');
    }
  }
};

export default redirectlessConfigValidator;
