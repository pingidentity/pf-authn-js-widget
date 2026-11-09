//tests for the MFA IK 4.2 features: new states, actions, and PingID Desktop Gen2 util
import AuthnWidget from '../../src'
import Store from '../../src/store';
import {
  callPingIdDesktopConnector,
  buildSSOExtensionUrl,
  checkSSOCallback,
  getSSOExtensionQueryParams,
  getGen2ErrorMessage
} from '../../src/utils/pingIdDesktopGen2Util';

describe('MFA IK 4.2 support', () => {

  describe('CORE_STATES', () => {
    test('contains the new 4.2 states', () => {
      expect(AuthnWidget.CORE_STATES).toContain('MFA_DENIED');
      expect(AuthnWidget.CORE_STATES).toContain('YUBIKEY_ACTIVATION_REQUIRED');
      expect(AuthnWidget.CORE_STATES).toContain('MOBILE_PAIRING_REQUIRED');
      expect(AuthnWidget.CORE_STATES).toContain('PINGID_DESKTOP_ACTIVATION_REQUIRED');
      expect(AuthnWidget.CORE_STATES).toContain('PINGID_DESKTOP_GEN2_ACTIVATION_REQUIRED');
      expect(AuthnWidget.CORE_STATES).toContain('PINGID_DESKTOP_GEN2_ASSERTION_REQUIRED');
    });

    test('registers handlers for the new states', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      expect(authn.eventHandler.get('YUBIKEY_ACTIVATION_REQUIRED')).toBeTruthy();
      expect(authn.eventHandler.get('PINGID_DESKTOP_GEN2_ASSERTION_REQUIRED')).toBeTruthy();
      expect(authn.eventHandler.get('PINGID_DESKTOP_GEN2_ACTIVATION_REQUIRED')).toBeTruthy();
      expect(authn.eventHandler.get('DEVICE_SELECTION_REQUIRED')).toContain(authn.registerForgotDeviceHandler);
    });
  });

  describe('actionModels', () => {
    test('registers the new 4.2 action models', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      expect(authn.actionModels.get('activateYubikeyDevice')).toEqual({ required: ['otp'] });
      expect(authn.actionModels.get('activatePingIdDesktopGen2Device')).toEqual({ required: ['origin', 'attestation'] });
      expect(authn.actionModels.get('pingIdDesktopGen2CheckAssertion')).toEqual({ required: ['assertion', 'origin'] });
    });
  });

  describe('forgotYourDevice', () => {
    test('handleForgotDevice dispatches forgotYourDevice action', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      let evt = { preventDefault: jest.fn().mockName('preventDefault') };

      authn.handleForgotDevice(evt);

      expect(evt.preventDefault).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'forgotYourDevice', '{}');
      expect(authn.renderSpinnerTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('PingID Desktop Gen2 connector', () => {
    test('callPingIdDesktopConnector posts JWT to local connector and resolves response', async () => {
      const mockXhr = {
        open: jest.fn(),
        setRequestHeader: jest.fn(),
        send: jest.fn(),
        onload: null,
        status: 200,
        responseText: 'assertion-jwt-123'
      };
      global.XMLHttpRequest = jest.fn(() => mockXhr);

      const promise = callPingIdDesktopConnector(4152, 'request-jwt', 'authenticate');
      mockXhr.onload();

      await expect(promise).resolves.toBe('assertion-jwt-123');
      expect(mockXhr.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:4152/authenticate', true);
      expect(mockXhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/jwt');
      expect(mockXhr.send).toHaveBeenCalledWith('request-jwt');
    });

    test('callPingIdDesktopConnector rejects with error code from connector', async () => {
      const mockXhr = {
        open: jest.fn(),
        setRequestHeader: jest.fn(),
        send: jest.fn(),
        onload: null,
        status: 400,
        responseText: 'notEnrolled'
      };
      global.XMLHttpRequest = jest.fn(() => mockXhr);

      const promise = callPingIdDesktopConnector(4152, 'request-jwt', 'register');
      mockXhr.onload();

      await expect(promise).rejects.toThrow('notEnrolled');
    });

    test('callPingIdDesktopConnector rejects with default error on network failure', async () => {
      const mockXhr = {
        open: jest.fn(),
        setRequestHeader: jest.fn(),
        send: jest.fn(),
        onerror: null
      };
      global.XMLHttpRequest = jest.fn(() => mockXhr);

      const promise = callPingIdDesktopConnector(4152, 'request-jwt', 'authenticate');
      mockXhr.onerror();

      await expect(promise).rejects.toThrow('default');
    });

    test('getGen2ErrorMessage maps connector error codes and falls back to default', () => {
      expect(getGen2ErrorMessage('notEnrolled')).toBe('You are not enrolled for this application.');
      expect(getGen2ErrorMessage('canceledByUser')).toBe('The request was canceled.');
      expect(getGen2ErrorMessage('unknownCode')).toBe('Unable to complete PingID Desktop authentication. Please try again.');
    });

    test('buildSSOExtensionUrl points at the extension endpoint with request and callback hash', () => {
      window.history.replaceState({}, '', 'http://localhost/authn/flow?flowId=abc');

      const navUrl = buildSSOExtensionUrl('request-jwt', 'register');

      expect(navUrl).toContain('/pingid/desktop/register');
      expect(navUrl).toContain('request=request-jwt');
      expect(navUrl).toContain('redirect_uri=');
      const redirectUri = decodeURIComponent(navUrl.split('redirect_uri=')[1].split('&')[0]);
      expect(redirectUri).toContain('pingid_sso_callback');
      expect(redirectUri).toContain('flowId=abc');
    });
  });

  describe('SSO extension callback', () => {
    test('getSSOExtensionQueryParams reads auth_token from hash and strips it', () => {
      window.location.hash = '#pingid_sso_callback?auth_token=abc123';

      const result = getSSOExtensionQueryParams();

      expect(result).toEqual({ token: 'abc123' });
      expect(window.location.hash).toBe('');
    });

    test('getSSOExtensionQueryParams reads reg_token from query params', () => {
      window.history.replaceState({}, '', 'http://localhost/authn/flow?reg_token=reg456');

      const result = getSSOExtensionQueryParams();

      expect(result).toEqual({ token: 'reg456' });
      expect(window.location.search).toBe('');
    });

    test('getSSOExtensionQueryParams returns error from hash', () => {
      window.location.hash = '#pingid_sso_callback?error=canceledByUser';

      const result = getSSOExtensionQueryParams();

      expect(result).toEqual({ token: null, error: 'canceledByUser' });
    });

    test('getSSOExtensionQueryParams returns null token when no callback present', () => {
      window.location.hash = '';
      window.location.search = '';

      const result = getSSOExtensionQueryParams();

      expect(result).toEqual({ token: null });
    });

    test('checkSSOCallback returns null when not Safari', () => {
      window.location.hash = '#pingid_sso_callback?auth_token=abc';
      Object.defineProperty(window.navigator, 'userAgent', { value: 'Chrome', configurable: true });

      expect(checkSSOCallback()).toBeNull();
    });
  });

  describe('Gen2 assertion post-render', () => {
    test('submitPingIdDesktopGen2Assertion posts assertion and origin', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      document.body.innerHTML = '<div id="authnwidget"><div id="pingIdDesktopGen2SpinnerId"></div></div>';

      authn.submitPingIdDesktopGen2Assertion('assertion-jwt');

      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'pingIdDesktopGen2CheckAssertion',
        JSON.stringify({ assertion: 'assertion-jwt', origin: 'http://localhost' }));
      expect(document.querySelector('#pingIdDesktopGen2SpinnerId').style.display).toBe('block');
    });

    test('postPingIdDesktopGen2ActivationRequired cancels pairing on SSO error', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      window.location.hash = '#pingid_sso_callback?error=notEnrolled';
      Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15', configurable: true });

      authn.postPingIdDesktopGen2ActivationRequired();

      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'cancelDevicePairing', '{}');
      window.location.hash = '';
    });
  });
});
