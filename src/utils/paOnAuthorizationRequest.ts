import paOnAuthorizationRequestValidator from '../validators/paOnAuthorizationRequest';

export interface PaAuthorizationRequestChallenge {
  authorizationUrl: string;
}

const options: RequestInit = {
  method: 'GET',
  credentials: 'include',
};

const paOnAuthorizationRequest = (challenge: PaAuthorizationRequestChallenge): () => Promise<Response> => {
  paOnAuthorizationRequestValidator(challenge);
  return () => fetch(challenge.authorizationUrl, options);
};

export default paOnAuthorizationRequest;
