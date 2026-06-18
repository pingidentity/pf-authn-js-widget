import validator from 'validate.js';

interface PaAuthorizationRequestChallenge {
  authorizationUrl: string;
}

const paOnAuthorizationRequestValidator = (challenge: PaAuthorizationRequestChallenge): void => {
  if (validator.isEmpty(challenge)) {
    throw new Error('PingFederate Authentication API Challenge response is required.');
  }

  const authorizationUrl = challenge.authorizationUrl;
  if (validator.isEmpty(authorizationUrl)) {
    throw new Error('authorizationUrl attribute is required');
  } else {
    if (!validator.isString(authorizationUrl)) {
      throw new Error('authorizationUrl attribute must be a string.');
    }
  }
};

export default paOnAuthorizationRequestValidator;
