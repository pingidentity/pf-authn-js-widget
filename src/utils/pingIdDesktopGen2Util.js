const PINGID_SSO_CALLBACK_HASH = '#pingid_sso_callback';

const GEN2_ERROR_MESSAGES = {
  userAlreadyEnrolledForTheRelyingParty: 'You are already enrolled for this application.',
  limitExeeded: 'The number of allowed devices has been exceeded.',
  lockedOut: 'Your account is locked. Please contact your administrator.',
  touchIdIsNotAvailableInClosedClamshellMode: 'Touch ID is not available in closed clamshell mode.',
  mutipleRelyingPartiesNotSupported: 'Multiple relying parties are not supported.',
  notEnrolled: 'You are not enrolled for this application.',
  canceledByTimeout: 'The request timed out. Please try again.',
  canceledByUser: 'The request was canceled.',
  originNotAllowed: 'The origin is not allowed.',
  userNotRegisteredForRelyingParty: 'You are not registered for this application.',
  recordNotFound: 'The record was not found.',
  default: 'Unable to complete PingID Desktop authentication. Please try again.'
};

function getGen2ErrorMessage(errorCode) {
  return GEN2_ERROR_MESSAGES[errorCode] || GEN2_ERROR_MESSAGES.default;
}

function isSafari() {
  const userAgent = window.navigator.userAgent;
  const isSafariBrowser = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
  if (window.navigator.userAgentData) {
    const platform = window.navigator.userAgentData.platform || '';
    return isSafariBrowser && platform.toLowerCase().indexOf('mac') !== -1;
  }
  return isSafariBrowser && /Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent);
}

function getSSOExtensionUrl() {
  return 'https://' + window.location.hostname + '/pingid/desktop';
}

/**
 * Reads the auth token / error returned by the PingID Desktop SSO extension
 * after the redirect back from `{hostname}/pingid/desktop/...`.
 * The token can arrive in the URL hash (primary) or as a query parameter (fallback).
 */
export function getSSOExtensionQueryParams() {
  if (window.location.hash && window.location.hash.indexOf(PINGID_SSO_CALLBACK_HASH) === 0) {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const paramsString = hash.substring(qIndex + 1).replace(/\?/g, '&');
      const hashParams = new URLSearchParams(paramsString);

      const error = hashParams.get('error');
      if (error) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        return { token: null, error: error };
      }

      const token = hashParams.get('auth_token') || hashParams.get('reg_token');
      if (token) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        return { token: token };
      }
    }
  }

  // Fallback to query params
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('auth_token') || queryParams.get('reg_token');
  if (token) {
    const url = new URL(window.location.href);
    url.searchParams.delete('auth_token');
    url.searchParams.delete('reg_token');
    window.history.replaceState({}, document.title, url.toString());
    return { token: token };
  }

  return { token: null };
}

/**
 * Sends the JWT request to the local PingID Desktop Gen2 connector
 * (http://127.0.0.1:{port}/register or /authenticate) and resolves with the
 * JWT response (attestation for register, assertion for authenticate).
 */
export function callPingIdDesktopConnector(port, requestBody, operation) {
  return new Promise((resolve, reject) => {
    const url = 'http://127.0.0.1:' + port + '/' + operation;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/jwt');
    xhr.onload = function () {
      if (xhr.status === 200 && xhr.responseText) {
        resolve(xhr.responseText);
      } else {
        const errorCode = GEN2_ERROR_MESSAGES[xhr.responseText] ? xhr.responseText : 'default';
        reject(new Error(errorCode));
      }
    };
    xhr.onerror = function () {
      reject(new Error('default'));
    };
    xhr.send(requestBody);
  });
}

/**
 * Builds the PingID Desktop Gen2 SSO extension URL: the extension endpoint with
 * the request JWT and a redirect_uri that carries the #pingid_sso_callback hash
 * for the response.
 */
export function buildSSOExtensionUrl(credentialRequestOptions, operation) {
  const baseUrl = getSSOExtensionUrl() + '/' + operation;
  let redirectUri = window.location.href;

  // Clean up current URL of any previous callback artifacts
  redirectUri = redirectUri.split('#')[0]
    .replace(/([?&])(auth_token|reg_token)=[^&]*/g, '$1')
    .replace(/[?&]+$/, '');

  // Set hash for callback
  redirectUri += PINGID_SSO_CALLBACK_HASH;

  return baseUrl + '?redirect_uri=' + encodeURIComponent(redirectUri) +
    '&request=' + encodeURIComponent(credentialRequestOptions);
}

/**
 * Kicks off the PingID Desktop Gen2 SSO extension flow (Safari only):
 * navigates the top window to the extension URL.
 */
export function authenticateViaSSOExtension(credentialRequestOptions, operation) {
  // Top-level navigation so the Redirect-type SSO extension will run
  window.top.location.assign(buildSSOExtensionUrl(credentialRequestOptions, operation));
}

export { isSafari, getGen2ErrorMessage };

/**
 * Handles a completed Gen2 SSO-extension callback: returns the token, or an
 * error code when the extension reported a failure. Returns null when the
 * current URL is not an SSO callback.
 */
export function checkSSOCallback() {
  if (!isSafari()) {
    return null;
  }
  const result = getSSOExtensionQueryParams();
  if (result.error) {
    return { error: result.error };
  }
  if (result.token) {
    return { token: result.token };
  }
  return null;
}
