//tests for the shared PingOne Signals SDK loader (signalsSdkUtil)
import {
  selectSignalsSdkVersion,
  signalsSdkUrl,
  whenSignalsSdkReady,
  loadSignalsSdkScript,
  SIGNALS_SDK_VERSIONS
} from '../../src/utils/signalsSdkUtil';

describe('signalsSdkUtil', () => {
  afterEach(() => {
    delete window._pingOneSignals;
    delete window._pingOneSignalsReady;
    document.head.querySelectorAll('script[src*="signals-sdk"]')
      .forEach(script => script.remove());
  });

  describe('selectSignalsSdkVersion', () => {
    test('returns 5.6.11 only when the modern SDK requirements hold', () => {
      // jsdom 19 exposes neither crypto nor indexedDB, so it legitimately
      // selects the legacy build here; what matters is the branching logic.
      // The 5.6.11 build is the one carrying universalDeviceIdentification —
      // the 5.2.7 build makes the PingOne remember-me API fail with
      // "Failed to parse empty SDK payload jwt" (QA finding, P14C-82959).
      const version = selectSignalsSdkVersion();
      expect(['5.2.7', '5.6.11']).toContain(version);
      // No crypto in this environment → legacy build.
      if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
        expect(version).toBe('5.2.7');
      } else {
        expect(version).toBe('5.6.11');
      }
    });

    test('picks 5.2.7 when crypto.getRandomValues is missing', () => {
      // This jsdom has no window.crypto at all, so the check already holds;
      // assert through the helper without mutating globals.
      if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
        expect(selectSignalsSdkVersion()).toBe('5.2.7');
      } else {
        // Force the branch: temporarily hide crypto.
        const originalCrypto = window.crypto;
        // @ts-ignore - simulate a legacy browser
        delete window.crypto;
        try {
          expect(selectSignalsSdkVersion()).toBe('5.2.7');
        } finally {
          window.crypto = originalCrypto;
        }
      }
    });

    test('picks 5.2.7 when indexedDB is missing', () => {
      const originalIndexedDB = window.indexedDB;
      // @ts-ignore - simulate a legacy browser
      delete window.indexedDB;
      try {
        expect(selectSignalsSdkVersion()).toBe('5.2.7');
      } finally {
        window.indexedDB = originalIndexedDB;
      }
    });

    test('picks 5.2.7 for IE11-class engines (documentMode)', () => {
      const originalDocumentMode = document.documentMode;
      // @ts-ignore - simulate IE11
      delete document.documentMode;
      Object.defineProperty(document, 'documentMode', { value: 11, configurable: true });
      try {
        expect(selectSignalsSdkVersion()).toBe('5.2.7');
      } finally {
        if (originalDocumentMode === undefined) {
          delete document.documentMode;
        } else {
          Object.defineProperty(document, 'documentMode', { value: originalDocumentMode, configurable: true });
        }
      }
    });
  });

  describe('signalsSdkUrl', () => {
    test('builds the PingOne CDN URL for a requested version', () => {
      expect(signalsSdkUrl('5.6.11'))
        .toBe('https://apps.pingone.com/signals/web-sdk/5.6.11/signals-sdk.js');
      expect(signalsSdkUrl('5.2.7'))
        .toBe('https://apps.pingone.com/signals/web-sdk/5.2.7/signals-sdk.js');
    });

    test('defaults to the browser-appropriate version when none is requested', () => {
      const url = signalsSdkUrl();
      expect(url).toMatch(/signals\/web-sdk\/(5\.2\.7|5\.6\.11)\/signals-sdk\.js$/);
      expect(url).toContain('/' + selectSignalsSdkVersion() + '/');
    });
  });

  describe('whenSignalsSdkReady', () => {
    test('resolves immediately when the SDK global is already assigned', async () => {
      window._pingOneSignals = { init: jest.fn() };
      await whenSignalsSdkReady();
      // Reaching here without timing out is the assertion.
    });

    test('resolves when the ready flag is set even without the global', async () => {
      window._pingOneSignalsReady = true;
      await whenSignalsSdkReady();
    });

    test('waits for PingOneSignalsReadyEvent when neither signal is present', async () => {
      const ready = whenSignalsSdkReady();
      let resolved = false;
      ready.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      document.dispatchEvent(new window.CustomEvent('PingOneSignalsReadyEvent'));
      await ready;
    });
  });

  describe('loadSignalsSdkScript', () => {
    test('appends the script to head and wires onload/onerror', () => {
      const onLoad = jest.fn();
      const onError = jest.fn();
      const script = loadSignalsSdkScript('https://example.test/signals-sdk.js', onLoad, onError);

      expect(document.head.querySelector('script[src="https://example.test/signals-sdk.js"]')).toBeTruthy();
      expect(script.onload).toBe(onLoad);
      expect(script.onerror).toBe(onError);
    });
  });

  describe('SIGNALS_SDK_VERSIONS', () => {
    test('legacy build is the one without universalDeviceIdentification', () => {
      // The Remember Me device match requires universalDeviceIdentification,
      // which only the modern build carries — this pins the semantics of the
      // two constants.
      expect(SIGNALS_SDK_VERSIONS.LEGACY).toBe('5.2.7');
      expect(SIGNALS_SDK_VERSIONS.MODERN).toBe('5.6.11');
    });
  });
});
