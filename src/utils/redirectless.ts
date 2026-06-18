export const FLOW_TYPE_AUTHZ = 0;
export const FLOW_TYPE_USER_AUTHZ = 1;

export interface RedirectlessConfig {
  flowType?: number;
  client_id?: string;
  response_type?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  redirect_uri?: string;
  scope?: string | string[];
  state?: string;
  idp?: string;
  pfidpadapterid?: string;
  access_token_manager_id?: string;
  aud?: string;
  nonce?: string;
  prompt?: string;
  acr_values?: string;
  max_age?: string;
  login_hint?: string;
  ui_locales?: string;
  id_token_hint?: string;
  claims_locales?: string;
  user_code?: string;
  onAuthorizationSuccess: (response: Response) => void;
  onAuthorizationFailed?: (state: unknown) => void;
  onAuthorizationRequest?: () => Promise<Response>;
}

const allowedAuthRequestParameters = [
  'client_id', 'response_type', 'code_challenge', 'code_challenge_method',
  'redirect_uri', 'scope', 'state', 'idp', 'pfidpadapterid', 'access_token_manager_id', 'aud', 'nonce', 'prompt',
  'acr_values', 'max_age', 'login_hint', 'ui_locales', 'id_token_hint', 'claims_locales',
] as const;

export function isUserAuthzFlowType(configuration: Pick<RedirectlessConfig, 'flowType'>): boolean {
  return FLOW_TYPE_USER_AUTHZ === configuration.flowType;
}

export function isAuthzFlowType(configuration: Pick<RedirectlessConfig, 'flowType'>): boolean {
  return !configuration.flowType || FLOW_TYPE_AUTHZ === configuration.flowType;
}

export function completeStateCallback(
  state: { status: string; authorizeResponse?: unknown },
  configuration: Pick<RedirectlessConfig, 'onAuthorizationSuccess'>
): void {
  if (state.status === 'COMPLETED' && state.authorizeResponse) {
    configuration.onAuthorizationSuccess(state.authorizeResponse as Response);
  }
}

export function failedStateCallback(
  state: { status: string },
  configuration: Pick<RedirectlessConfig, 'onAuthorizationFailed'>
): void {
  if (state.status === 'FAILED') {
    if (configuration.onAuthorizationFailed) {
      configuration.onAuthorizationFailed(state);
    } else {
      console.log('No onAuthorizationFailed method passed in the configuration.');
    }
  }
}

export function initRedirectless(baseUrl: string, configuration: RedirectlessConfig): Promise<Response> {
  if (configuration.onAuthorizationRequest) {
    return configuration.onAuthorizationRequest();
  } else {
    const authUrl = isUserAuthzFlowType(configuration)
      ? generateUserAuthorizationUrl(baseUrl, configuration)
      : generateAuthorizationUrl(baseUrl, configuration);
    const options: RequestInit = {
      method: 'GET',
      credentials: 'include',
    };
    return fetch(authUrl, options);
  }
}

function generateUserAuthorizationUrl(baseUrl: string, configuration: RedirectlessConfig): string {
  let endpoint = '/as/user_authz.oauth2';
  if (configuration.user_code) {
    endpoint = endpoint.concat('?user_code=').concat(configuration.user_code);
  }
  return generateAuthorizationUrl(baseUrl, configuration, endpoint);
}

export function generateAuthorizationUrl(
  baseUrl: string,
  configuration: Partial<RedirectlessConfig> = {},
  endpoint = '/as/authorization.oauth2'
): string {
  const encodeValue = (value: string | string[]): string => {
    if (Array.isArray(value)) {
      return encodeURI(value.join(' '));
    }
    return encodeURI(value);
  };

  let authEndpoint = baseUrl.endsWith('/') ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl;
  authEndpoint = authEndpoint + endpoint;

  for (const param of allowedAuthRequestParameters) {
    if (Object.prototype.hasOwnProperty.call(configuration, param)) {
      const value = configuration[param as keyof typeof configuration] as string | string[];
      const encodedValue = encodeValue(value);
      const encodedParam = encodeURI(param);
      const separator = authEndpoint.indexOf('?') === -1 ? '?' : '&';
      authEndpoint = authEndpoint + separator + `${encodedParam}=${encodedValue}`;
    }
  }

  return authEndpoint + (authEndpoint.indexOf('?') === -1 ? '?' : '&') + 'response_mode=pi.flow';
}
