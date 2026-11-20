//tests for the Remember Me feature (P14C-82959, PingOne MFA IK 4.2+)
import AuthnWidget from "../../src"
import Store from "../../src/store";

  describe('Remember Me (P14C-82959)', () => {
    // The IK's remember-me verifier/manager adapters expose three Authn API
    // states; the widget must render each and drive the same actions the IK
    // templates drive:
    //   EVALUATE_REMEMBER_ME_DEVICE / MANAGE_REMEMBER_ME_DEVICE
    //     → profile the browser with the PingOne Signals SDK, POST
    //       submitDeviceInformation { browserFingerprint }
    //   REMEMBER_ME_USER_CONSENT_REQUIRED
    //     → submitRememberMeUserConsent { userConsent: remember | doNotRemember
    //       | doNotAskAgain }
    const originalDispatch = Store.prototype.dispatch;

    afterEach(() => {
      Store.prototype.dispatch = originalDispatch;
      jest.clearAllMocks();
      delete window._pingOneSignals;
      delete window._pingOneSignalsReady;
      // postEvaluateRememberMeDevice appends its SDK <script> to HEAD, not
      // body — without this, the next test's querySelector finds the previous
      // test's script, whose onload closure has already run (dispatched=true)
      // and silently no-ops.
      document.head.querySelectorAll('script[src*="signals-sdk"]')
        .forEach(script => script.remove());
      document.body.innerHTML = '';
    });

    test('CORE_STATES contains the three remember-me states', () => {
      expect(AuthnWidget.CORE_STATES).toContain('EVALUATE_REMEMBER_ME_DEVICE');
      expect(AuthnWidget.CORE_STATES).toContain('REMEMBER_ME_USER_CONSENT_REQUIRED');
      expect(AuthnWidget.CORE_STATES).toContain('MANAGE_REMEMBER_ME_DEVICE');
    });

    test('registers the profiling handler on both device states and the consent handler', () => {
      const authn = new AuthnWidget('https://localhost:9031');
      // postRenderCallbacks is a Map-like plain object accessed by [] (addPostRenderCallback),
      // so assert through the same access style the render loop uses.
      expect(Array.from(authn.postRenderCallbacks['EVALUATE_REMEMBER_ME_DEVICE']))
        .toContain(authn.postEvaluateRememberMeDevice);
      expect(Array.from(authn.postRenderCallbacks['MANAGE_REMEMBER_ME_DEVICE']))
        .toContain(authn.postEvaluateRememberMeDevice);
      expect(authn.eventHandler.get('REMEMBER_ME_USER_CONSENT_REQUIRED'))
        .toContain(authn.registerRememberMeConsentHandler);
    });

    describe('postEvaluateRememberMeDevice', () => {
      test('loads the configured deviceProfileScript and POSTs the fingerprint', () => {
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031',
          { divId: 'authnwidget', deviceProfileScript: './signals-sdk.js' });
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');

        // The state the adapter wrote (deviceProfileTimeoutMillis arrives flat
        // in the state JSON, like every other model field).
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };
        authn.postEvaluateRememberMeDevice();

        // The SDK script tag was appended from the configured option.
        const script = document.querySelector('script[src="./signals-sdk.js"]');
        expect(script).toBeTruthy();

        // Simulate the SDK becoming ready and returning a profile. The real
        // SDK's getData() resolves to a STRING (base64-encoded signals payload
        // — the IK templates put it straight into a form input value).
        // Profiling is gated on the SCRIPT ELEMENT's load event (fires only
        // after the whole SDK file evaluated, i.e. after its last statement
        // assigns window._pingOneSignals) — NOT on PingOneSignalsReadyEvent,
        // which the SDK dispatches mid-file BEFORE assigning the global.
        window._pingOneSignals = {
          init: jest.fn().mockReturnValue(Promise.resolve()),
          getData: jest.fn().mockResolvedValue('eyJwYXlsb2FkIn0.signals-identifier')
        };
        script.onload();

        return Promise.resolve().then(() => {
          expect(window._pingOneSignals.init).toBeCalledWith({ universalDeviceIdentification: true });
          expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitDeviceInformation',
            JSON.stringify({ browserFingerprint: 'eyJwYXlsb2FkIn0.signals-identifier' }));
          jest.useRealTimers();
        });
      });

      test('does not profile on the SDK ready event alone — waits for the script to finish evaluating', () => {
        // Regression (QA, P14C-82959): both bundled SDK builds dispatch
        // PingOneSignalsReadyEvent mid-file, BEFORE their last statement
        // assigns window._pingOneSignals, and once the document is loaded
        // the SDK's DOM-ready wrapper fires that event synchronously DURING
        // script evaluation. Gating on the ready event alone therefore
        // profiled a window without the SDK and submitted the empty
        // fingerprint the adapter received as a null browserFingerprint.
        // The ready flag being set (as it is mid-file) must not trigger
        // profiling before the script element's load event.
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031',
          { divId: 'authnwidget', deviceProfileScript: './signals-sdk.js' });
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        authn.postEvaluateRememberMeDevice();
        // The SDK's mid-file state: ready flag set, global not yet assigned.
        window._pingOneSignalsReady = true;
        document.dispatchEvent(new window.CustomEvent('PingOneSignalsReadyEvent'));
        expect(Store.prototype.dispatch).not.toBeCalled();

        // Then the script finishes evaluating (the load event fires) and
        // profiling proceeds against the now-assigned SDK global.
        window._pingOneSignals = {
          init: jest.fn().mockReturnValue(Promise.resolve()),
          getData: jest.fn().mockResolvedValue('eyJwYXlsb2FkIn0.after-script-load')
        };
        document.querySelector('script[src="./signals-sdk.js"]').onload();

        return Promise.resolve().then(() => {
          expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitDeviceInformation',
            JSON.stringify({ browserFingerprint: 'eyJwYXlsb2FkIn0.after-script-load' }));
          jest.useRealTimers();
        });
      });

      test('loads the PingOne-hosted SDK (browser-appropriate version) when deviceProfileScript is not configured', () => {
        // The CDN 5.6.11 build is byte-identical to the copy bundled with the
        // IK's remember-me templates (verified 2026-11-19), so the Remember Me
        // flow gets the exact build its adapter validated without the host
        // application having to place any file. The version-picking helper is
        // unit-tested in test/utils/signalsSdkUtil.test.js.
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'MANAGE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        authn.postEvaluateRememberMeDevice();

        const script = document.querySelector('script[src^="https://apps.pingone.com/signals/web-sdk/"]');
        expect(script).toBeTruthy();
        expect(script.src).toMatch(/signals\/web-sdk\/(5\.2\.7|5\.6\.11)\/signals-sdk\.js$/);
        jest.useRealTimers();
      });

      test('a second profiling state reuses the already-injected SDK instead of re-injecting it', () => {
        // Regression (QA, P14C-82959): a first Remember Me login renders
        // TWO profiling states in one page session (EVALUATE_REMEMBER_ME_DEVICE
        // before the MFA adapter, MANAGE_REMEMBER_ME_DEVICE after). Injecting
        // the SDK for the second state re-evaluated the file, whose top-level
        // `const Browser` (not wrapped in an IIFE) threw
        // "Uncaught SyntaxError: Identifier 'Browser' has already been
        // declared" — the error page QA saw between the two states.
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031',
          { divId: 'authnwidget', deviceProfileScript: './signals-sdk.js' });
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        // First state: injects and profiles.
        authn.postEvaluateRememberMeDevice();
        window._pingOneSignals = {
          init: jest.fn().mockReturnValue(Promise.resolve()),
          getData: jest.fn().mockResolvedValue('eyJwYXlsb2FkIn0.first-state')
        };
        document.querySelector('script[src="./signals-sdk.js"]').onload();

        return Promise.resolve().then(() => {
          expect(Store.prototype.dispatch).toBeCalledTimes(1);
          // Second state in the same page session: the SDK global is
          // already assigned, so no second <script> may be appended and
          // profiling must run immediately against the existing global.
          authn.store.state = { status: 'MANAGE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };
          window._pingOneSignals.getData.mockResolvedValue('eyJwYXlsb2FkIn0.second-state');
          authn.postEvaluateRememberMeDevice();

          expect(document.querySelectorAll('script[src="./signals-sdk.js"]').length).toBe(1);
          return Promise.resolve().then(() => {
            expect(Store.prototype.dispatch).toBeCalledTimes(2);
            expect(Store.prototype.dispatch).toHaveBeenLastCalledWith('POST_FLOW', 'submitDeviceInformation',
              JSON.stringify({ browserFingerprint: 'eyJwYXlsb2FkIn0.second-state' }));
            jest.useRealTimers();
          });
        });
      });

      test('a second profiling state waits on the existing tag while its script is still in flight', () => {
        // The in-flight variant: the earlier state injected the SDK but it
        // has not finished evaluating yet (tag present, global unassigned).
        // The second state must attach to the EXISTING tag's load event —
        // NOT inject again (SyntaxError) and NOT listen for the ready event
        // (fires mid-file, before the global assignment — the round-3
        // null-fingerprint bug).
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031',
          { divId: 'authnwidget', deviceProfileScript: './signals-sdk.js' });
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        // First state injects; the script never loads in this test — it
        // stays in flight.
        authn.postEvaluateRememberMeDevice();
        const firstTag = document.querySelector('script[src="./signals-sdk.js"]');

        // Second state arrives after the first state's timeout submitted {}
        // (that empty-fingerprint fallback is what advanced the flow here —
        // the same sequence a slow network produces in production).
        jest.advanceTimersByTime(5000);
        expect(Store.prototype.dispatch).toBeCalledTimes(1);
        authn.store.state = { status: 'MANAGE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };
        authn.postEvaluateRememberMeDevice();
        expect(document.querySelectorAll('script[src="./signals-sdk.js"]').length).toBe(1);

        // The script finally finishes evaluating: global assigned, load
        // fires. Only the SECOND state (whose dispatched flag is still
        // false) may submit — the first state already spent its one submit.
        // A real load event invokes BOTH the tag's onload property (state 1's
        // handler) and state 2's addEventListener listener.
        window._pingOneSignals = {
          init: jest.fn().mockReturnValue(Promise.resolve()),
          getData: jest.fn().mockResolvedValue('eyJwYXlsb2FkIn0.late-arrival')
        };
        firstTag.dispatchEvent(new window.Event('load'));

        return Promise.resolve().then(() => {
          expect(Store.prototype.dispatch).toBeCalledTimes(2);
          expect(Store.prototype.dispatch).toHaveBeenLastCalledWith('POST_FLOW', 'submitDeviceInformation',
            JSON.stringify({ browserFingerprint: 'eyJwYXlsb2FkIn0.late-arrival' }));
          jest.useRealTimers();
        });
      });

      test('timeout submits an empty fingerprint instead of hanging on the spinner', () => {
        // No fingerprint → the IK adapter answers VALIDATION_ERROR /
        // BROWSER_FINGERPRINT_REQUIRED, which renders through the standard
        // error path; hanging forever is worse.
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        authn.postEvaluateRememberMeDevice();
        jest.advanceTimersByTime(5000);

        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitDeviceInformation', '{}');
        jest.useRealTimers();
      });

      test('falls back to the IK default 5000ms when the state has no timeout', () => {
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE' };

        authn.postEvaluateRememberMeDevice();
        jest.advanceTimersByTime(4999);
        expect(Store.prototype.dispatch).not.toBeCalled();

        jest.advanceTimersByTime(1);
        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitDeviceInformation', '{}');
        jest.useRealTimers();
      });

      test('an SDK getData() rejection submits the empty fingerprint fallback', async () => {
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031',
          { divId: 'authnwidget', deviceProfileScript: './signals-sdk.js' });
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        authn.postEvaluateRememberMeDevice();
        window._pingOneSignals = {
          init: jest.fn().mockReturnValue(Promise.resolve()),
          getData: jest.fn().mockRejectedValue(new Error('sdk broken'))
        };
        // Script-load gate: fire the script element's load, as a real
        // browser does once the whole SDK file has evaluated.
        document.querySelector('script[src="./signals-sdk.js"]').onload();

        // Flush the microtask chain: getData's rejection propagates through
        // .catch(submitError) a few ticks deep.
        for (let i = 0; i < 5; i++) {
          await Promise.resolve();
        }
        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitDeviceInformation', '{}');
        jest.useRealTimers();
      });

      test('submits only once even when the timeout races the SDK callback', () => {
        // dispatched flag: the timeout fallback must not double-POST after the
        // real fingerprint already landed (or vice versa).
        jest.useFakeTimers();
        const authn = new AuthnWidget('https://localhost:9031',
          { divId: 'authnwidget', deviceProfileScript: './signals-sdk.js' });
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.store.state = { status: 'EVALUATE_REMEMBER_ME_DEVICE', deviceProfileTimeoutMillis: 5000 };

        authn.postEvaluateRememberMeDevice();
        window._pingOneSignals = {
          init: jest.fn().mockReturnValue(Promise.resolve()),
          getData: jest.fn().mockResolvedValue('eyJwYXlsb2FkIn0.race-test-payload')
        };
        document.querySelector('script[src="./signals-sdk.js"]').onload();

        return Promise.resolve().then(() => {
          jest.advanceTimersByTime(5000);
          expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
          jest.useRealTimers();
        });
      });
    });

    describe('remember-me consent', () => {
      test('parsing data-remember-me-consent through real HTML yields the consent value', () => {
        document.body.innerHTML =
          '<button id="consentBtn" data-remember-me-consent="remember">Remember Device</button>';
        const btn = document.getElementById('consentBtn');
        expect(btn.dataset.rememberMeConsent).toBe('remember');
      });

      test('registration is bound and wires the consent buttons', () => {
        document.body.innerHTML =
          '<button id="yes" data-remember-me-consent="remember">Remember Device</button>' +
          '<button id="no" data-remember-me-consent="doNotRemember">Don\'t Remember</button>' +
          '<a id="dontAsk" data-remember-me-consent="doNotAskAgain">Don\'t ask again</a>';
        const authn = new AuthnWidget('https://localhost:9031');

        authn.registerRememberMeConsentHandler(); // must not throw (bound method)

        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');

        document.getElementById('yes').click();
        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitRememberMeUserConsent',
          JSON.stringify({ userConsent: 'remember' }));

        document.getElementById('no').click();
        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitRememberMeUserConsent',
          JSON.stringify({ userConsent: 'doNotRemember' }));

        document.getElementById('dontAsk').click();
        expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'submitRememberMeUserConsent',
          JSON.stringify({ userConsent: 'doNotAskAgain' }));
      });

      test('consent click shows the spinner immediately', () => {
        document.body.innerHTML =
          '<button id="yes" data-remember-me-consent="remember">Remember Device</button>';
        const authn = new AuthnWidget('https://localhost:9031');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');

        authn.handleRememberMeConsent({
          preventDefault: jest.fn().mockName('preventDefault'),
          currentTarget: document.getElementById('yes')
        });

        expect(authn.renderSpinnerTemplate).toHaveBeenCalledTimes(1);
      });

      test('null target dispatches nothing', () => {
        const authn = new AuthnWidget('https://localhost:9031');
        authn.renderSpinnerTemplate = jest.fn().mockName('renderSpinnerTemplate');
        Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');

        authn.handleRememberMeConsent({
          preventDefault: jest.fn().mockName('preventDefault'),
          currentTarget: null
        });

        expect(authn.renderSpinnerTemplate).not.toBeCalled();
        expect(Store.prototype.dispatch).not.toBeCalled();
      });
    });

    describe('remember-me partials', () => {
      // Same compile-the-hbs-directly pattern as the push-rejected tests: the
      // webpack handlebars-loader only runs in the build, so tests register the
      // sub-partials by hand.
      const handlebars = require('handlebars');
      const fs = require('fs');
      const path = require('path');
      const partialsDir = path.join(__dirname, '../../src/partials');

      const renderRememberMe = (templateFile, state) => {
        const hbs = handlebars.create();
        hbs.registerPartial('spinner', fs.readFileSync(path.join(partialsDir, 'spinner.hbs'), 'utf8'));
        hbs.registerPartial('errors', fs.readFileSync(path.join(partialsDir, 'errors.hbs'), 'utf8'));
        const template = hbs.compile(fs.readFileSync(path.join(partialsDir, templateFile), 'utf8'));
        return template(Object.assign({ logo: 'logo.png' }, state));
      };

      test('consent screen renders the three choices with their data attributes', () => {
        const html = renderRememberMe('remember_me_user_consent_required.hbs', {});
        expect(html).toContain('Remember This Device?');
        expect(html).toContain('data-remember-me-consent="remember"');
        expect(html).toContain('data-remember-me-consent="doNotRemember"');
        expect(html).toContain('data-remember-me-consent="doNotAskAgain"');
        expect(html).toContain('Remember Device');
        expect(html).toContain("Don't Remember");
        expect(html).toContain("Don't ask again on this device");
        expect(html).toContain('Skip authentication steps on this device');
      });

      test('profiling screens render the spinner', () => {
        const evaluate = renderRememberMe('evaluate_remember_me_device.hbs', {});
        expect(evaluate).toContain('id="spinnerId"');
        expect(evaluate).toContain('Profiling Device');
        const manage = renderRememberMe('manage_remember_me_device.hbs', {});
        expect(manage).toContain('id="spinnerId"');
        expect(manage).toContain('Profiling Device');
      });

      test('profiling screens surface adapter-supplied errors', () => {
        // VALIDATION_ERROR / BROWSER_FINGERPRINT_REQUIRED arrives as userMessages
        // through the store's error mapping; the partials include {{> errors}}.
        const html = renderRememberMe('evaluate_remember_me_device.hbs',
          { userMessages: ['A browser fingerprint is required.'] });
        expect(html).toContain('A browser fingerprint is required.');
      });
    });
});
