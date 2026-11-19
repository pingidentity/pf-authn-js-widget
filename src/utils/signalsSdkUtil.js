/*
 * Shared loader for the PingOne Signals SDK.
 *
 * Two flows in the widget profile the browser with this SDK: the Protect /
 * risk-provider flow (utils/risk-providers/signals.js) and the MFA
 * Integration Kit's Remember Me device states (postEvaluateRememberMeDevice).
 * This module centralizes what both share: where the SDK builds live, which
 * build a browser needs, how to inject the script, and when the SDK global
 * is usable.
 */

// PingOne hosts the SDK builds publicly. The 5.6.11 build served here is
// byte-identical to the copy bundled with the MFA Integration Kit's
// remember-me templates (verified 2026-11-19), so the Remember Me flow gets
// the exact build its adapter validated without the host application having
// to place any file. Customers whose PF cannot reach apps.pingone.com host a
// build locally and point the widget's deviceProfileScript option at it.
const SIGNALS_SDK_CDN_BASE = 'https://apps.pingone.com/signals/web-sdk/';

export const SIGNALS_SDK_VERSIONS = {
  // Legacy build for IE11-class engines and browsers without the modern
  // build's requirements. It lacks universalDeviceIdentification, which the
  // Remember Me device match needs — loading it there yields "Failed to
  // parse empty SDK payload jwt" from the PingOne API (QA, P14C-82959).
  LEGACY: '5.2.7',
  // Modern build; the only one carrying universalDeviceIdentification.
  MODERN: '5.6.11'
};

/*
 * Pick the SDK build the same way the IK's pingone-mfa-remember-me-spinner.html
 * does (its shouldUseLegacySdk()): IE11-class engines (documentMode / Trident)
 * and browsers lacking the modern build's requirements (crypto.getRandomValues,
 * indexedDB) get the legacy build; everyone else gets the modern build.
 */
export function selectSignalsSdkVersion() {
  // IE / Trident (the embedded thick-client browsers this flow supports).
  if (document.documentMode || /MSIE|Trident\//.test(navigator.userAgent || '')) {
    return SIGNALS_SDK_VERSIONS.LEGACY;
  }
  // Capabilities required by the modern SDK.
  if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
    return SIGNALS_SDK_VERSIONS.LEGACY;
  }
  try {
    if (!window.indexedDB || typeof window.indexedDB.open !== 'function') {
      return SIGNALS_SDK_VERSIONS.LEGACY;
    }
  } catch (e) {
    return SIGNALS_SDK_VERSIONS.LEGACY;
  }
  return SIGNALS_SDK_VERSIONS.MODERN;
}

/*
 * URL for a Signals SDK build. Defaults to the build the current browser
 * needs (selectSignalsSdkVersion()).
 */
export function signalsSdkUrl(version) {
  return SIGNALS_SDK_CDN_BASE + (version || selectSignalsSdkVersion()) + '/signals-sdk.js';
}

/*
 * Inject the SDK script. onLoad fires only after the whole file has been
 * evaluated — the builds the CDN serves assign window._pingOneSignals on
 * their LAST statement, so the global is guaranteed by then. Gate on THIS
 * event, not on PingOneSignalsReadyEvent: the SDK dispatches that event
 * mid-file, BEFORE its last statement assigns window._pingOneSignals, and —
 * because the SDK's DOM-ready wrapper runs its callback synchronously once
 * the document is loaded — the event fires DURING script evaluation on every
 * page that has already reached window load. A synchronous ready listener
 * therefore ran while window._pingOneSignals was still undefined, and the
 * Remember Me flow submitted the empty fingerprint the adapter received as
 * a null browserFingerprint (QA, P14C-82959).
 */
export function loadSignalsSdkScript(src, onLoad, onError) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = onLoad;
  script.onerror = onError;
  document.head.appendChild(script);
  return script;
}

/*
 * The script element already loading (or having loaded) this src, if any.
 * Callers must NOT inject a second script for the same SDK: the SDK builds
 * declare top-level const bindings (e.g. `const Browser = {...}`) that are
 * NOT wrapped in an IIFE, so a second evaluation of the file throws
 * "Uncaught SyntaxError: Identifier 'Browser' has already been declared".
 * The Remember Me flow hits this for real — on a first login it renders
 * TWO profiling states in one page session (EVALUATE_REMEMBER_ME_DEVICE
 * before the MFA adapter, MANAGE_REMEMBER_ME_DEVICE after), and each one
 * profiles. Also matches when the host page loaded an SDK build itself.
 */
export function findSignalsSdkScript(src) {
  const scripts = document.querySelectorAll('script[src]');
  for (let i = 0; i < scripts.length; i++) {
    // getAttribute covers relative srcs as written; .src is the resolved
    // absolute URL — match either so relative and absolute callers work.
    if (scripts[i].getAttribute('src') === src || scripts[i].src === src) {
      return scripts[i];
    }
  }
  return null;
}

/*
 * Resolve once the SDK global is usable. Promise-based on purpose: even when
 * PingOneSignalsReadyEvent fires synchronously mid-evaluation (any document
 * past DOM-ready), the continuation only runs as a microtask — i.e. AFTER
 * the current script evaluation finished and the SDK's last statement
 * assigned window._pingOneSignals. Safe to call before, during, or after
 * the SDK script loads; pairs with loadSignalsSdkScript's onLoad for the
 * script-load-first, ready-event-second gate the Remember Me flow needs.
 */
export function whenSignalsSdkReady() {
  return new Promise(resolve => {
    if (window['_pingOneSignalsReady'] || window._pingOneSignals) {
      resolve();
    } else {
      document.addEventListener('PingOneSignalsReadyEvent', () => resolve(), { once: true });
    }
  });
}
