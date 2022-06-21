
const allowedAuthRequestParameters = ['client_id', 'response_type', 'code_challenge', 'code_challenge_method',
  'redirect_uri', 'scope', 'state', 'idp', 'pfidpadapterid', 'access_token_manager_id', 'aud', 'nonce', 'prompt',
  'acr_values', 'max_age', 'login_hint', 'ui_locales', 'id_token_hint', 'claims_locales'];

export const FLOW_TYPE_USER_AUTHZ = 1;

/**
 * Check if the redirectless configuration object is set for user authz interaction.
 *
 * @param {JSON} configuration  The redirectless configuration object
 */
export function isUserAuthzFlowType(configuration) {
  return FLOW_TYPE_USER_AUTHZ === configuration.flowType
}

/**
 * Call onAuthorizationSuccess when 'COMPLETED' state is reached.
 *
 * @param {JSON} state          The current state
 * @param {JSON} configuration  The redirectless configuration object
 */
export function completeStateCallback(state, configuration) {
  if (state.status === 'COMPLETED' && state.authorizeResponse) {
    configuration.onAuthorizationSuccess(state.authorizeResponse);
  }
}

/**
 * Call onAuthorizationFailed when 'FAILED' state is reached.
 *
 * @param {JSON} state          The current state
 * @param {JSON} configuration  The redirectless configuration object
 */
export function failedStateCallback(state, configuration) {
  if (state.status === 'FAILED') {
    if (configuration.onAuthorizationFailed) {
      configuration.onAuthorizationFailed(state);
    } else {
      console.log("No onAuthorizationFailed method passed in the configuration.");
    }
  }
}

/**
 * Initialize the redirectless flow
 *
 * @param {string} baseUrl      The Base URL of the authorization server
 * @param {JSON} configuration  The configuration object
 */
export function initRedirectless(baseUrl, configuration) {
  if (configuration.onAuthorizationRequest) {
    return configuration.onAuthorizationRequest();
  } else {
    const authUrl = isUserAuthzFlowType(configuration)
      ? generateUserAuthorizationUrl(baseUrl, configuration)
      : generateAuthorizationUrl(baseUrl, configuration);
    const options = {
      method: 'GET',
      credentials: 'include'
    }
    return fetch(authUrl, options);
  }
}

/**
 * Generate the user authorization URL to interact with the authorization server.
 *
 * @param {string} baseUrl The Base URL of the authorization server
 * @param {JSON} configuration The configuration object used to generate the authorization URL
 */
function generateUserAuthorizationUrl(baseUrl, configuration) {
  let endpoint = '/as/user_authz.oauth2';
  if (configuration.user_code) {
    endpoint = endpoint.concat('?user_code=').concat(configuration.user_code);
  }
  return generateAuthorizationUrl(baseUrl, configuration, endpoint)
}

/**
 * Generate the authorization URL to interact with the authorization server.
 *
 * @param {string} baseUrl      The Base URL of the authorization server
 * @param {JSON} configuration  The configuration object used to generate the authorization URL
 * @param {string} endpoint     The AS' authorization endpoint, must start with '/', default is '/as/authorization.oauth2'
 */
export function generateAuthorizationUrl(baseUrl, configuration = {}, endpoint = '/as/authorization.oauth2') {

  // url encoder function
  const encodeValue = (value) => {
    if (Array.isArray(value)) {
      let result = '';
      for (const v of value) {
        if (result !== '') {
          result = result + ' ';
        }
        result = result + v;
      }
      return encodeURI(result);
    } else {
      return encodeURI(value);
    }
  }

  // create the URL
  let authEndpoint = baseUrl.endsWith('/') ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl;
  authEndpoint = authEndpoint + endpoint

  // create parameters
  for (const param of allowedAuthRequestParameters) {
    if (configuration.hasOwnProperty(param)) {
      const descriptor = Object.getOwnPropertyDescriptor(configuration, param);

      const encodedValue = encodeValue(descriptor.value)
      const encodedParam = encodeURI(param)
      const separator = authEndpoint.indexOf('?') === -1 ? '?' : '&'
      authEndpoint = authEndpoint + separator + `${encodedParam}=${encodedValue}`;
    }
  }

  // add response_mode and return
  return authEndpoint + (authEndpoint.indexOf('?') === -1 ? '?' : '&') + 'response_mode=pi.flow';
}
