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

    test('PUSH_CONFIRMATION_REJECTED registers retry + change-method handlers', () => {
      // Issue #154 follow-up: the rejected screen renders the Retry button
      // (number-matching) and the Change Method link; both need click handlers
      // registered for the state — previously neither was, so Change Method
      // rendered but did nothing when clicked. Retry uses its dedicated
      // handler (immediate spinner); the shared device-tile handler must NOT
      // be registered here or the selection screen regresses.
      const authn = new AuthnWidget('https://localhost:9031');
      const handlers = authn.eventHandler.get('PUSH_CONFIRMATION_REJECTED');
      expect(handlers).toContain(authn.registerRetryDeviceSelectionHandler);
      expect(handlers).toContain(authn.registerMfaChangeDeviceEventHandler);
      expect(handlers).toContain(authn.registerForgotDeviceHandler);
      expect(handlers).not.toContain(authn.registerMfaEventHandler);
    });

    test('registerRetryDeviceSelectionHandler is bound and wires the retry button', () => {
      // The registration method runs via forEach(fn => fn()) — an unbound
      // method gets `this === undefined` and the render crashes with the
      // generic "Unable to start the authentication flow" error. It must be
      // bound in the constructor AND find the hyphenated attribute.
      document.body.innerHTML =
        '<button id="retryBtn" data-retry-selection="dev-9">Retry</button>';
      const authn = new AuthnWidget('https://localhost:9031');

      authn.registerRetryDeviceSelectionHandler(); // must not throw

      const dispatched = [];
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      document.getElementById('retryBtn').click();
      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'selectDevice',
        JSON.stringify({ deviceRef: { id: 'dev-9' } }));
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

  describe('YubiKey OTP validation', () => {
    test('44-character alphanumeric YubiKey OTP enables submit', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      document.body.innerHTML = '<form id="AuthnWidgetForm">' +
        '<button id="submit">Sign On</button>' +
        '<input id="otp" name="otp" type="text" class="required" maxlength="44" value=""/></form>';
      const input = document.getElementById('otp');
      const submit = document.getElementById('submit');
      input.value = 'cccccctivbtdnkjjgjrvvudebvhjblnefubktuufvivi'; // YubiKey modhex OTP

      authn.enableSubmit();

      expect(submit.disabled).toBe(false);
    });

    test('44-character OTP with invalid characters keeps submit disabled', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      document.body.innerHTML = '<form id="AuthnWidgetForm">' +
        '<button id="submit">Sign On</button>' +
        '<input id="otp" name="otp" type="text" class="required" maxlength="44" value=""/></form>';
      const input = document.getElementById('otp');
      const submit = document.getElementById('submit');
      input.value = 'cccccctivbtdnkjjgjrvvudebvhjblnefubktuufvi!@#';

      authn.enableSubmit();

      expect(submit.disabled).toBe(true);
    });

    test('short numeric OTP still validates with 6-char minimum', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      document.body.innerHTML = '<form id="AuthnWidgetForm">' +
        '<button id="submit">Sign On</button>' +
        '<input id="otp" name="otp" type="text" class="required" maxlength="6" value=""/></form>';
      const input = document.getElementById('otp');
      const submit = document.getElementById('submit');

      input.value = '12345';
      authn.enableSubmit();
      expect(submit.disabled).toBe(true);

      input.value = '123456';
      authn.enableSubmit();
      expect(submit.disabled).toBe(false);
    });

    test('numeric OTP rejected when longer than maxlength', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      document.body.innerHTML = '<form id="AuthnWidgetForm">' +
        '<button id="submit">Sign On</button>' +
        '<input id="otp" name="otp" type="text" class="required" maxlength="6" value=""/></form>';
      const input = document.getElementById('otp');
      const submit = document.getElementById('submit');
      input.value = '12345678901234';

      authn.enableSubmit();

      expect(submit.disabled).toBe(true);
    });
  });

  describe('gt helper (inline-safe)', () => {
    // Regression: a block-style helper used inside an inline subexpression
    // crashes template rendering with "n.fn/n.inverse is not a function".
    // gt must return a plain boolean so {{#if (gt otpLength 20)}} works.
    const gt = require('../../src/helpers/gt');

    test('works as an inline subexpression returning a boolean', () => {
      expect(gt(44, 20, {})).toBe(true);
      expect(gt(6, 20, {})).toBe(false);
      expect(gt(undefined, 20, {})).toBe(false);
      expect(gt('44', 20, {})).toBe(true);
    });
  });

  describe('P14C-85737 Change Device gating', () => {
    // The IK formulas: canChangeDevice = changeDevicePermitted && (paired > 1
    // || (paired == 1 && manualPairing)); canForgotDevice (auth screens) =
    // backupAuthEnabled && paired == 1 && oneTimeCount > 0; loose FYD gate =
    // backupAuthEnabled && oneTimeCount > 0. One-time (backup) devices are
    // excluded from the paired count.
    const derive = AuthnWidget.deriveDeviceGatingFlags;

    test('two paired devices allow Change Method, not FYD', () => {
      const flags = derive(
        [{ id: 'd1' }, { id: 'd3' }], true, false, true);
      expect(flags.canChangeDevice).toBe(true);
      expect(flags.canForgotDevice).toBe(false);
      expect(flags.canForgotDeviceLoose).toBe(false);
    });

    test('single paired device with manualPairing allows Change Method', () => {
      expect(derive([{ id: 'd1' }], true, true, true).canChangeDevice).toBe(true);
      expect(derive([{ id: 'd1' }], true, false, true).canChangeDevice).toBe(false);
    });

    test('one paired plus one-time backup allows FYD but not Change Method', () => {
      const flags = derive(
        [{ id: 'd1' }, { id: 'd2', isOneTimeDevice: true }], true, false, true);
      expect(flags.canChangeDevice).toBe(false);
      expect(flags.canForgotDevice).toBe(true);
      expect(flags.canForgotDeviceLoose).toBe(true);
      expect(flags.pairedDeviceCount).toBe(1);
      expect(flags.oneTimeDeviceCount).toBe(1);
    });

    test('changeDevicePermitted false disables Change Method everywhere', () => {
      const flags = derive([{ id: 'd1' }, { id: 'd3' }], false, false, true);
      expect(flags.canChangeDevice).toBe(false);
    });

    test('backupAuthEnabled false disables FYD', () => {
      const flags = derive([{ id: 'd1' }, { id: 'd2', isOneTimeDevice: true }], true, false, false);
      expect(flags.canForgotDevice).toBe(false);
      expect(flags.canForgotDeviceLoose).toBe(false);
    });

    test('missing devices list yields all-false flags without throwing', () => {
      const flags = derive(undefined, true, false, true);
      expect(flags.canChangeDevice).toBe(false);
      expect(flags.canForgotDevice).toBe(false);
      expect(flags.pairedDeviceCount).toBe(0);
    });
  });

  describe('forgotYourDevice', () => {
    test('handleForgotDevice dispatches forgotYourDevice action', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      let evt = {
        preventDefault: jest.fn().mockName('preventDefault'),
        stopPropagation: jest.fn().mockName('stopPropagation')
      };

      authn.handleForgotDevice(evt);

      expect(evt.preventDefault).toHaveBeenCalledTimes(1);
      expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'forgotYourDevice', '{}');
      expect(authn.renderSpinnerTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispatch bubbled-click guard', () => {
    // A click on a child without its own actionId (e.g. the Forgot Your Device
    // link) bubbles to the form's [data-actionId] listener and must NOT re-post
    // the form's action (the FIDO/Gen2 assertion replay bug).
    test('ignores bubbled clicks whose target has no actionId', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      authn.getFormData = jest.fn().mockName('getFormData').mockReturnValue({});
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      const form = { dataset: { actionid: 'checkAssertion' } };
      const anchor = { dataset: {} };
      const evt = {
        preventDefault: jest.fn().mockName('preventDefault'),
        stopPropagation: jest.fn().mockName('stopPropagation'),
        target: anchor,
        currentTarget: form
      };

      authn.dispatch(evt);

      expect(Store.prototype.dispatch).not.toHaveBeenCalled();
    });

    test('still dispatches when the click starts on an action element', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      authn.getFormData = jest.fn().mockName('getFormData').mockReturnValue({ otp: '123456' });
      authn.validateActionModel = jest.fn().mockName('validateActionModel').mockReturnValue({ otp: '123456' });
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      const button = { dataset: { actionid: 'checkOtp' } };
      const evt = {
        preventDefault: jest.fn().mockName('preventDefault'),
        stopPropagation: jest.fn().mockName('stopPropagation'),
        target: button,
        currentTarget: button
      };

      authn.dispatch(evt);

      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'checkOtp', '{"otp":"123456"}');
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

  describe('P14C-85737 Change Device click behavior', () => {
    // The link deselects the current device the way the IK templates'
    // unselectDevice() does: POST selectDevice with a blank device id. A GET
    // of the flow would not work from every state (Gen2 assertion has no
    // resume branch in the IK status handler). The spinner renders
    // synchronously first, blocking double-clicks.
    test('handleMfaDeviceChange shows spinner then POSTs selectDevice with blank id', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      document.body.innerHTML = '<div id="authnwidget"></div>';
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      const evt = { preventDefault: jest.fn().mockName('preventDefault') };

      authn.handleMfaDeviceChange(evt);

      expect(authn.renderSpinnerTemplate).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'selectDevice',
        JSON.stringify({ deviceRef: { id: '' } }));
    });
  });

  describe('P14C-88164 targetApplicationName', () => {
    test('widget option flows into template params', () => {
      const authn = new AuthnWidget('https://localhost:9031', { targetApplicationName: 'My App' });
      expect(authn.assets.toTemplateParams().targetApplicationName).toBe('My App');
    });

    test('option absent leaves targetApplicationName undefined so the state value wins', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      expect(authn.assets.toTemplateParams().targetApplicationName).toBeUndefined();
    });
  });

  describe('PingID Mobile differentiation', () => {
    // The IK templates branch on selectedDevice.sourceDeviceType == PINGID_MOBILE
    // (the mapped device.type is Android/iPhone for both native and PingID Mobile).
    const derive = AuthnWidget.deriveSelectedDeviceFlags;

    test('flags the selected device when sourceDeviceType is PINGID_MOBILE', () => {
      const flags = derive(
        [{ id: 'd1', type: 'iPhone', sourceDeviceType: 'PINGID_MOBILE' }, { id: 'd2', type: 'Email' }],
        { id: 'd1' });
      expect(flags.isPingIdMobile).toBe(true);
    });

    test('native mobile (no sourceDeviceType) is not PingID Mobile', () => {
      const flags = derive(
        [{ id: 'd1', type: 'Android' }, { id: 'd2', type: 'Email' }],
        { id: 'd1' });
      expect(flags.isPingIdMobile).toBe(false);
    });

    test('a PingID Mobile device that is NOT selected does not set the flag', () => {
      const flags = derive(
        [{ id: 'd1', type: 'iPhone', sourceDeviceType: 'PINGID_MOBILE' }, { id: 'd2', type: 'Email' }],
        { id: 'd2' });
      expect(flags.isPingIdMobile).toBe(false);
    });

    test('missing devices or ref yields false without throwing', () => {
      expect(derive(undefined, { id: 'd1' }).isPingIdMobile).toBe(false);
      expect(derive([{ id: 'd1' }], undefined).isPingIdMobile).toBe(false);
      expect(derive(undefined, undefined).isPingIdMobile).toBe(false);
    });
  });

  describe('Issue #154 screen-display flags', () => {
    // The IK surfaces its "Show Error / Success / Timeout Screens" settings on the
    // state models; when a screen is disabled the widget skips it and dispatches the
    // action the user would have taken, letting PF advance the policy chain.
    const getScreenSkipAction = AuthnWidget.getScreenSkipAction;

    describe('getScreenSkipAction mapping', () => {
      test('MFA_FAILED with displayErrorScreen false maps to cancelAuthentication', () => {
        expect(getScreenSkipAction({ status: 'MFA_FAILED', displayErrorScreen: false }))
          .toBe('cancelAuthentication');
      });

      test('MFA_FAILED with displayErrorScreen true (or absent) maps to null', () => {
        expect(getScreenSkipAction({ status: 'MFA_FAILED', displayErrorScreen: true })).toBeNull();
        expect(getScreenSkipAction({ status: 'MFA_FAILED' })).toBeNull();
      });

      test('MFA_DENIED follows the error-screen flag', () => {
        expect(getScreenSkipAction({ status: 'MFA_DENIED', displayErrorScreen: false }))
          .toBe('cancelAuthentication');
        expect(getScreenSkipAction({ status: 'MFA_DENIED', displayErrorScreen: true })).toBeNull();
      });

      test('MFA_DEVICE_PAIRING_METHOD_FAILED maps to cancelDevicePairing', () => {
        expect(getScreenSkipAction({ status: 'MFA_DEVICE_PAIRING_METHOD_FAILED', displayErrorScreen: false }))
          .toBe('cancelDevicePairing');
        expect(getScreenSkipAction({ status: 'MFA_DEVICE_PAIRING_METHOD_FAILED', displayErrorScreen: true }))
          .toBeNull();
      });

      test('PUSH_CONFIRMATION_REJECTED follows the error-screen flag', () => {
        expect(getScreenSkipAction({ status: 'PUSH_CONFIRMATION_REJECTED', displayErrorScreen: false }))
          .toBe('cancelAuthentication');
        expect(getScreenSkipAction({ status: 'PUSH_CONFIRMATION_REJECTED' })).toBeNull();
      });

      test('PUSH_CONFIRMATION_TIMED_OUT follows the timeout-screen flag', () => {
        expect(getScreenSkipAction({ status: 'PUSH_CONFIRMATION_TIMED_OUT', displayTimeoutScreen: false }))
          .toBe('cancelAuthentication');
        expect(getScreenSkipAction({ status: 'PUSH_CONFIRMATION_TIMED_OUT', displayErrorScreen: false }))
          .toBeNull();
      });

      test('MFA_COMPLETED with displaySuccessScreen false maps to continueAuthentication', () => {
        expect(getScreenSkipAction({ status: 'MFA_COMPLETED', displaySuccessScreen: false }))
          .toBe('continueAuthentication');
        expect(getScreenSkipAction({ status: 'MFA_COMPLETED', displaySuccessScreen: true })).toBeNull();
        expect(getScreenSkipAction({ status: 'MFA_COMPLETED' })).toBeNull();
      });

      test('other states and falsy input never skip', () => {
        expect(getScreenSkipAction({ status: 'OTP_REQUIRED', displayErrorScreen: false })).toBeNull();
        expect(getScreenSkipAction({})).toBeNull();
        expect(getScreenSkipAction(null)).toBeNull();
        expect(getScreenSkipAction(undefined)).toBeNull();
      });
    });

    describe('maybeSkipScreenPerAdapterSetting', () => {
      const originalDispatch = Store.prototype.dispatch;

      afterEach(() => {
        Store.prototype.dispatch = originalDispatch;
        jest.clearAllMocks();
      });

      test('dispatches the skip action when the flag disables the screen', async () => {
        const authn = new AuthnWidget('https://localhost:9031');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');

        authn.maybeSkipScreenPerAdapterSetting({ status: 'MFA_FAILED', displayErrorScreen: false });

        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'cancelAuthentication', '{}');
      });

      test('does nothing when the flag allows the screen', () => {
        const authn = new AuthnWidget('https://localhost:9031');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');

        authn.maybeSkipScreenPerAdapterSetting({ status: 'MFA_FAILED', displayErrorScreen: true });

        expect(Store.prototype.dispatch).not.toBeCalled();
        expect(authn.renderSpinnerTemplate).not.toBeCalled();
      });

      test('a second skip for the same state object is a no-op (loop guard)', () => {
        const authn = new AuthnWidget('https://localhost:9031');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        const state = { status: 'MFA_COMPLETED', displaySuccessScreen: false };

        authn.maybeSkipScreenPerAdapterSetting(state);
        authn.maybeSkipScreenPerAdapterSetting(state);

        expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
      });

      test('skipping MFA_COMPLETED cancels the pending auto-continue timer', () => {
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        // the normal MFA_COMPLETED post-render auto-continue
        authn.postContinueAuthentication();
        expect(Store.prototype.dispatch).not.toBeCalled(); // still on the 1s timer

        authn.maybeSkipScreenPerAdapterSetting({ status: 'MFA_COMPLETED', displaySuccessScreen: false });
        expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1); // the immediate skip

        jest.advanceTimersByTime(2000);
        // the cancelled auto-continue timer must NOT have fired a second dispatch
        expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
      });
    });
  });

  describe('PUSH_CONFIRMATION_REJECTED message per rejection reason', () => {
    // The IK's HTML UI picks the message from the language pack by rejectionReason
    // (pingone.mfa.push.confirmation.*.message keys); the widget partial mirrors that:
    // NUMBER_MATCHING_FAILED → "You chose the wrong number",
    // USER_FRAUD_DENIED → "Push notification reported as fraud",
    // PUSH_BIOMETRICS_REJECTED → "Biometric authentication rejected",
    // anything else → "Push notification denied".
    const handlebars = require('handlebars');
    const fs = require('fs');
    const path = require('path');

    const renderRejected = (state) => {
      const hbs = handlebars.create();
      hbs.registerHelper('ifEq', require('../../src/helpers/ifEq'));
      const partialsDir = path.join(__dirname, '../../src/partials');
      hbs.registerPartial('error', fs.readFileSync(path.join(partialsDir, 'error.hbs'), 'utf8'));
      hbs.registerPartial('change_device_link', fs.readFileSync(path.join(partialsDir, 'change_device_link.hbs'), 'utf8'));
      hbs.registerPartial('forgot_device_link', fs.readFileSync(path.join(partialsDir, 'forgot_device_link.hbs'), 'utf8'));
      hbs.registerPartial('admin_message', fs.readFileSync(path.join(partialsDir, 'admin_message.hbs'), 'utf8'));
      const template = hbs.compile(fs.readFileSync(path.join(partialsDir, 'push_confirmation_rejected.hbs'), 'utf8'));
      return template(Object.assign({ logo: 'logo.png' }, state));
    };

    test('NUMBER_MATCHING_FAILED renders the wrong-number message', () => {
      const html = renderRejected({ reason: 'NUMBER_MATCHING_FAILED' });
      expect(html).toContain('You chose the wrong number');
      expect(html).not.toContain('Push notification denied');
    });

    test('USER_FRAUD_DENIED renders the fraud message', () => {
      const html = renderRejected({ reason: 'USER_FRAUD_DENIED' });
      expect(html).toContain('Push notification reported as fraud');
      expect(html).not.toContain('Push notification denied');
    });

    test('PUSH_BIOMETRICS_REJECTED renders the biometrics message', () => {
      const html = renderRejected({ reason: 'PUSH_BIOMETRICS_REJECTED' });
      expect(html).toContain('Biometric authentication rejected');
      expect(html).not.toContain('Push notification denied');
    });

    test('default reason (DENIED_BY_USER / absent) renders the generic denied message', () => {
      expect(renderRejected({ reason: 'DENIED_BY_USER' })).toContain('Push notification denied');
      expect(renderRejected({})).toContain('Push notification denied');
    });

    test('NUMBER_MATCHING_FAILED renders the Retry button bound to the selected device', () => {
      // IK business requirement: retry re-initiates the number-matching push by
      // re-selecting the same device (retry() → selectDevice with the device id).
      // The attribute is hyphenated data-retry-selection (the HTML parser
      // lowercases attribute names; a camelCase one would lose the id) and maps
      // to dataset.retrySelection in the dedicated spinner handler.
      const html = renderRejected({ reason: 'NUMBER_MATCHING_FAILED', selectedDeviceRef: { id: 'dev-1' } });
      expect(html).toContain('Retry');
      expect(html).toContain('data-retry-selection="dev-1"');
      expect(html).not.toContain('data-mfa-selection');
    });

    test('Retry button is omitted when the rejected state has no selected device', () => {
      // IK template guards the retry button on $selectedDevice as well.
      const html = renderRejected({ reason: 'NUMBER_MATCHING_FAILED' });
      expect(html).not.toContain('Retry');
    });

    test('non-number-matching reasons never render the Retry button', () => {
      ['USER_FRAUD_DENIED', 'PUSH_BIOMETRICS_REJECTED', 'DENIED_BY_USER'].forEach(reason => {
        expect(renderRejected({ reason, selectedDeviceRef: { id: 'dev-1' } })).not.toContain('Retry');
      });
    });

    test('every variant still offers Cancel', () => {
      ['NUMBER_MATCHING_FAILED', 'USER_FRAUD_DENIED', 'PUSH_BIOMETRICS_REJECTED', 'DENIED_BY_USER']
        .forEach(reason => {
          expect(renderRejected({ reason })).toContain('cancelAuthentication');
        });
    });
  });

  describe('Retry click gives immediate spinner feedback', () => {
    // The retry button uses its dedicated handler via the hyphenated attribute
    // data-retry-selection (the HTML parser lowercases attribute names, so a
    // camelCase data-retrySelection lands in the DOM as data-retryselection and
    // dataset.retrySelection reads undefined — the id was being dropped and the
    // retry POSTed an empty deviceRef). The shared device-tile handler shows the
    // IN-PLACE spinner (no DOM replacement, which read as a second page refresh).
    test('parsing data-retry-selection through real HTML yields the device id in dataset', () => {
      document.body.innerHTML =
        '<button id="retryBtn" data-retry-selection="dev-1">Retry</button>';
      const btn = document.getElementById('retryBtn');
      expect(btn.dataset.retrySelection).toBe('dev-1');
    });

    test('handleRetryDeviceSelection renders spinner then POSTs selectDevice with the device id', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      const button = { dataset: { retrySelection: 'dev-1' } };
      const evt = {
        preventDefault: jest.fn().mockName('preventDefault'),
        currentTarget: button
      };

      authn.handleRetryDeviceSelection(evt);

      expect(evt.preventDefault).toHaveBeenCalledTimes(1);
      expect(authn.renderSpinnerTemplate).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'selectDevice',
        JSON.stringify({ deviceRef: { id: 'dev-1' } }));
    });

    test('handleMfaDeviceSelection replaces the page with the spinner and stops propagation', () => {
      // Device tiles nest data-mfa-selection on the tile AND its children, so a
      // child click would bubble to the tile listener and POST selectDevice
      // twice — the second POST lands in the state the first response already
      // reached (the "double refresh"). stopPropagation guards it. The spinner
      // is a full-page swap: the device list must be hidden during the round-trip.
      const authn = new AuthnWidget('https://localhost:9031');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      const evt = {
        preventDefault: jest.fn().mockName('preventDefault'),
        stopPropagation: jest.fn().mockName('stopPropagation'),
        currentTarget: { dataset: { mfaSelection: 'dev-1' } }
      };

      authn.handleMfaDeviceSelection(evt);

      expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
      expect(authn.renderSpinnerTemplate).toHaveBeenCalledTimes(1);
      expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'selectDevice',
        JSON.stringify({ deviceRef: { id: 'dev-1' } }));
    });

    test('null target still dispatches nothing (error path unchanged)', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
      Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
      const evt = {
        preventDefault: jest.fn().mockName('preventDefault'),
        currentTarget: null
      };

      authn.handleRetryDeviceSelection(evt);

      expect(authn.renderSpinnerTemplate).not.toBeCalled();
      expect(Store.prototype.dispatch).not.toBeCalled();
    });
  });
});
