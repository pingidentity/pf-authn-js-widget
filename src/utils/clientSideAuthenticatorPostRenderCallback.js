import AuthenticatorSupport from './authenticatorSupport';

/**
 * Collect the current widget form fields as an object. Authenticator scripts written for
 * PingFederate templates add hidden inputs to the form before submitting, so the form
 * fields (not just an explicit body) must be included.
 *
 * @returns {object} the form fields, or an empty object when no form is rendered
 */
function collectFormData() {
  const formElement = document.getElementById('AuthnWidgetForm');
  if (!formElement || typeof FormData === 'undefined') {
    return {};
  }
  const formData = new FormData(formElement);
  const data = {};
  // Convert formData to a map. IE11 has incredibly limited support for the FormData
  // type and corresponding methods.
  const formDataEntries = formData.entries();
  let formDataEntry = formDataEntries.next();
  while (!formDataEntry.done) {
    const pair = formDataEntry.value;
    if (!(pair[0] in data)) {
      data[pair[0]] = pair[1];
    }
    formDataEntry = formDataEntries.next();
  }
  return data;
}

/**
 * Post render callback for states that support a client side authenticator
 * (`authenticatorEnabled` in the authentication API response).
 *
 * Loads the authenticator's javascript files and gives it the chance to bind to
 * the page events (username/password fields, authenticator button).
 *
 * @param {object} state the current authentication API state
 * @param {Store} store the widget store
 */
export default (state, store) => {
  // fast fail - the state does not have a client side authenticator enabled
  if (!state.authenticatorEnabled) {
    return;
  }

  const attributes = state.clientSideAuthenticatorAttributes;
  const scripts = state.javascriptFilenames;

  const submitFunction = (body) => {
    // with no explicit body, post the current form fields, which include any hidden
    // inputs the authenticator added to the form
    const payload = body === undefined || body === null
      ? collectFormData()
      : body;
    store.dispatch('POST_FLOW', 'useClientSideAuthenticator', JSON.stringify(payload));
  };

  AuthenticatorSupport.initialize(submitFunction, scripts, attributes, store.baseUrl);
};
