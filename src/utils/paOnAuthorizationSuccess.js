import paOnAuthorizationSuccessValidator from '../validators/paOnAuthorizationSuccess';

const credentials = 'include';

const getParameters = (response) => {
  const result = [];
  Object.keys(response).forEach(key => result.push(key + '=' + response[key]))
  return result.join('&');
};

const postHeaders = () => {
  const headers = new Headers();

  headers.append("Content-Type", "application/x-www-form-urlencoded");
  return headers;
};

const postOidcAuthnResponse = (oidcAuthnResponseEndpoint, callback) => (response) => {
  const headers = postHeaders();
  const body = getParameters(response);

  const options = {
    headers,
    body,
    credentials,
    method: 'POST',
  };

  fetch(oidcAuthnResponseEndpoint, options)
    .then(resp => callback(null, resp))
    .catch(err => callback(err));
};

const getOptions = {
  credentials,
  method: 'GET'
};

const getOidcAuthnResponse = (oidcAuthnResponseEndpoint, callback) => (response) => {
  const parameters = getParameters(response);

  fetch(`${oidcAuthnResponseEndpoint}?${parameters}`, getOptions)
    .then(resp => callback(null, resp))
    .catch(err => callback(err));
}

const paOnAuthorizationSuccess = (challenge, callback) => {
  paOnAuthorizationSuccessValidator(challenge);
  const oidcAuthnResponseEndpoint = challenge.oidcAuthnResponseEndpoint;

  switch (challenge.method) {
    case 'GET':
      return getOidcAuthnResponse(oidcAuthnResponseEndpoint, callback);
    case 'POST':
      return postOidcAuthnResponse(oidcAuthnResponseEndpoint, callback);
    default:
      throw new Error('Invalid HTTP method.');
  }
};

export default paOnAuthorizationSuccess;