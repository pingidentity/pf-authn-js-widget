import { isScriptLoaded } from './uiUtils';

const LOG_PREFIX = '[Client Side Authenticator] ';
const AUTHENTICATOR_SCRIPT_PATH = 'assets/scripts/authenticators/';

/**
 * Registry that connects client side authenticator scripts with the widget.
 *
 * This mirrors the contract of PingFederate's `authenticator-support.js` used by the
 * HTML Form and Identifier First templates, so authenticator scripts written for
 * PingFederate templates also work inside the widget:
 *
 *   1. The widget renders a button marked with `data-id="authenticator-button"` and marks
 *      the username / password inputs with `data-id="authenticator-username"` /
 *      `data-id="authenticator-password"`.
 *   2. The widget loads the script files named in the state's `javascriptFilenames`.
 *   3. Each script registers itself with `AuthenticatorSupport.registerAuthenticator(obj)`.
 *   4. The widget calls `obj.initAuthenticator({usernameField, passwordField, button, attributes}, submitFunction)`
 *      so the authenticator can bind to the page's events.
 *   5. When the authenticator completes its client side work it calls `submitFunction(body)`
 *      to post the `useClientSideAuthenticator` action back to PingFederate. When called
 *      without a body, the current form fields (including any hidden inputs the
 *      authenticator added) are posted.
 */
class AuthenticatorSupport {
  constructor() {
    this.authenticators = [];
    this.submitFunction = null;
    this.attributes = null;
    this.usernameField = null;
    this.passwordField = null;
    this.authenticatorButton = null;
  }

  /**
   * Register an authenticator object. The object must expose an `initAuthenticator` method,
   * which is invoked immediately when the support has already been initialized.
   *
   * @param {object} authenticatorObj object exposing at minimum `initAuthenticator(context, submitFunction)`
   */
  registerAuthenticator(authenticatorObj) {
    if (authenticatorObj && typeof authenticatorObj.initAuthenticator === 'function') {
      this.authenticators.push(authenticatorObj);
      if (this.submitFunction) {
        this.initAuthenticator(authenticatorObj);
      }
    } else {
      console.error(LOG_PREFIX + 'Authenticator object must have an initAuthenticator method.');
    }
  }

  /**
   * Invoke `initAuthenticator` on an authenticator with the current context.
   *
   * @param {object} authenticatorObj the registered authenticator
   */
  initAuthenticator(authenticatorObj) {
    authenticatorObj.initAuthenticator({
      usernameField: this.usernameField,
      passwordField: this.passwordField,
      button: this.authenticatorButton,
      attributes: this.attributes,
    }, this.submitFunction);
  }

  /**
   * Initialize the support with the context of the state currently rendered by the widget:
   * locate the elements the authenticator may bind to, re-bind any authenticators that were
   * registered during a previous render, and load the state's authenticator scripts.
   *
   * @param {function} submitFunction called by the authenticator to post the
   *        `useClientSideAuthenticator` action; accepts an optional body object
   * @param {string[]} scripts the state's `javascriptFilenames`
   * @param {object|string} attributes the state's `clientSideAuthenticatorAttributes`
   * @param {string} baseUrl the PingFederate base URL used to resolve script locations
   */
  initialize(submitFunction, scripts, attributes, baseUrl) {
    this.submitFunction = submitFunction;
    this.attributes = this.parseAttributes(attributes);
    this.usernameField = document.querySelector('[data-id="authenticator-username"]');
    this.passwordField = document.querySelector('[data-id="authenticator-password"]');
    this.authenticatorButton = document.querySelector('[data-id="authenticator-button"]');

    // re-bind authenticators that registered during a previous render to the fresh DOM
    this.authenticators.forEach(authenticatorObj => this.initAuthenticator(authenticatorObj));

    if (!scripts || scripts.length < 1) {
      // no scripts to load; allow the button to post the authenticator action directly
      this.bindFallbackButton();
      return;
    }

    this.loadScripts(scripts, baseUrl).then(() => {
      if (this.authenticators.length === 0) {
        // no authenticator registered itself; allow the button to post the action directly
        this.bindFallbackButton();
      }
    });
  }

  /**
   * The authentication API returns the attributes as an object, while PingFederate
   * templates embed them as a JSON string - accept both.
   *
   * @param {object|string} attributes the state's `clientSideAuthenticatorAttributes`
   * @returns {object} the parsed attributes
   */
  parseAttributes(attributes) {
    if (typeof attributes === 'string') {
      try {
        return JSON.parse(attributes);
      } catch (e) {
        console.error(LOG_PREFIX + 'Unable to parse client side authenticator attributes.', e);
        return {};
      }
    }
    return attributes || {};
  }

  /**
   * Resolve a `javascriptFilenames` entry to a URL, following the PingFederate
   * client side authenticator conventions:
   *
   *   - full URLs are used as-is
   *   - paths starting with "/" are resolved against the PingFederate base URL
   *   - relative paths (containing a "/") are resolved against the PingFederate base URL
   *   - bare filenames are resolved against
   *     `<baseUrl>/assets/scripts/authenticators/`, where PingFederate serves the
   *     authenticator scripts it ships in `<pf>/server/default/conf/template/assets/scripts/authenticators`
   *
   * @param {string} name filename, relative path or full URL of the script
   * @param {string} baseUrl the PingFederate base URL
   * @returns {string} the resolved script URL
   */
  resolveScriptUrl(name, baseUrl) {
    if (/^https?:\/\//i.test(name)) {
      return name;
    }
    const base = (baseUrl || '').replace(/\/+$/, '');
    if (name.indexOf('/') === 0) {
      return base + name;
    }
    if (name.indexOf('/') >= 0) {
      return base + '/' + name;
    }
    return base + '/' + AUTHENTICATOR_SCRIPT_PATH + name;
  }

  /**
   * Load the authenticator scripts sequentially, skipping scripts that are already
   * present in the document.
   *
   * @param {string[]} scripts filenames, relative paths or full URLs
   * @param {string} baseUrl the PingFederate base URL
   * @returns {Promise} resolved once every script has been loaded (or failed)
   */
  async loadScripts(scripts, baseUrl) {
    for (const name of scripts) {
      if (isScriptLoaded(name)) {
        console.log(LOG_PREFIX + `script '${name}' is already loaded.`);
        continue;
      }
      await this.loadScript(this.resolveScriptUrl(name, baseUrl));
    }
  }

  loadScript(url) {
    return new Promise(resolve => {
      console.log(LOG_PREFIX + `loading script: ${url}`);
      const script = document.createElement('script');
      script.async = false;
      script.src = url;
      script.onload = () => {
        console.log(LOG_PREFIX + `script loaded: ${url}`);
        resolve();
      };
      script.onerror = () => {
        console.error(LOG_PREFIX + `failed to load authenticator script: ${url}`);
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Bind the authenticator button to the submit function. Used when no authenticator
   * script registered itself, so the rendered button still posts the
   * `useClientSideAuthenticator` action.
   */
  bindFallbackButton() {
    if (this.authenticatorButton && !this.authenticatorButton.dataset.csaFallbackBound) {
      this.authenticatorButton.dataset.csaFallbackBound = 'true';
      this.authenticatorButton.addEventListener('click', evt => {
        evt.preventDefault();
        if (this.submitFunction) {
          this.submitFunction();
        }
      });
    }
  }
}

const authenticatorSupport = new AuthenticatorSupport();

// authenticator scripts written for PingFederate templates reference
// `AuthenticatorSupport` as a global - expose the same global here
if (typeof window !== 'undefined' && !window.AuthenticatorSupport) {
  window.AuthenticatorSupport = authenticatorSupport;
}

export default authenticatorSupport;
