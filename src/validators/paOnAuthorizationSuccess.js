import validator from 'validate.js';

const paOnAuthorizationSuccessValidator = (challenge) => {
  if (validator.isEmpty(challenge)) {
    throw new Error('PingFederate Authentication API Challenge response is required.');
  }

  const oidcAuthnResponseEndpoint = challenge.oidcAuthnResponseEndpoint;
  if (validator.isEmpty(oidcAuthnResponseEndpoint)) {
    throw new Error('oidcAuthnResponseEndpoint attribute is required');
  } else {
    if (!validator.isString(oidcAuthnResponseEndpoint)) {
      throw new Error('oidcAuthnResponseEndpoint attribute must be a string.');
    }
  }

  const method = challenge.method;
  if (validator.isEmpty(method)) {
    throw new Error('method attribute is required');
  } else {
    if (!validator.isString(method)) {
      throw new Error('method attribute must be a string.');
    }
  }
};

export default paOnAuthorizationSuccessValidator;