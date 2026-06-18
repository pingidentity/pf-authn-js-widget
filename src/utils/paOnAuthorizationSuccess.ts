import paOnAuthorizationSuccessValidator from '../validators/paOnAuthorizationSuccess';

export interface PaAuthorizationSuccessChallenge {
  oidcAuthnResponseEndpoint: string;
  method: 'GET' | 'POST';
}

type AuthCallback = (err: Error | null, resp?: Response) => void;

const credentials = 'include' as const;

const getParameters = (response: Record<string, string>): string =>
  Object.keys(response).map(key => key + '=' + response[key]).join('&');

const postHeaders = (): Headers => {
  const headers = new Headers();
  headers.append('Content-Type', 'application/x-www-form-urlencoded');
  return headers;
};

const postOidcAuthnResponse =
  (oidcAuthnResponseEndpoint: string, callback: AuthCallback) =>
  (response: Record<string, string>): void => {
    const options: RequestInit = {
      headers: postHeaders(),
      body: getParameters(response),
      credentials,
      method: 'POST',
    };
    fetch(oidcAuthnResponseEndpoint, options)
      .then(resp => callback(null, resp))
      .catch(err => callback(err));
  };

const getOidcAuthnResponse =
  (oidcAuthnResponseEndpoint: string, callback: AuthCallback) =>
  (response: Record<string, string>): void => {
    const parameters = getParameters(response);
    fetch(`${oidcAuthnResponseEndpoint}?${encodeURI(parameters)}`, { credentials, method: 'GET' })
      .then(resp => callback(null, resp))
      .catch(err => callback(err));
  };

const paOnAuthorizationSuccess = (
  challenge: PaAuthorizationSuccessChallenge,
  callback: AuthCallback
): ((response: Record<string, string>) => void) => {
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
