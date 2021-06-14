import paOnAuthorizationRequestValidator from '../validators/paOnAuthorizationRequest';

const options = {
  method: 'GET',
  credentials: 'include'
};

const paOnAuthorizationRequest = (challenge) => {
  paOnAuthorizationRequestValidator(challenge);
  return () => fetch(challenge.authorizationUrl, options);
};

export default paOnAuthorizationRequest;