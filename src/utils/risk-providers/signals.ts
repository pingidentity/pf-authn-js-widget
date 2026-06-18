import { isScriptLoaded } from '../uiUtils';
import type { RiskAttributes, RiskProvider } from '../../types/risk';
import type { FormDataMap } from '../../types/state';

const LOG_PREFIX = '[PingOne Protect Provider] ';

interface StoreWithDispatch {
  dispatch(action: string, actionId: string, body: string): void;
}

export default class Signals implements RiskProvider {
  attributes: RiskAttributes;
  store: StoreWithDispatch;

  constructor(attributes: RiskAttributes, store: StoreWithDispatch) {
    this.attributes = attributes;
    this.store = store;
    window.signalsSDK_loaded = isScriptLoaded('signals-sdk');
  }

  isLoaded(): boolean {
    return window.signalsSDK_loaded;
  }

  getScriptHeader(): HTMLScriptElement {
    const script = document.createElement('script');
    script.src = 'https://apps.pingone.com/signals/web-sdk/5.2.7/signals-sdk.js';
    script.onload = () => {
      console.log(LOG_PREFIX + 'triggering onload event');
      window.signalsSDK_loaded = true;
    };
    return script;
  }

  getUIElement(): string {
    return '<div></div>';
  }

  render(): void {
    this.onSignalsSdkReady().then(() => window._pingOneSignals.init());

    if (this.isLoaded()) {
      console.log(LOG_PREFIX + 'script is loaded.');
      return;
    }

    console.log(LOG_PREFIX + 'loading script');
    document.head.appendChild(this.getScriptHeader());
  }

  execute(actionId: string, formData: FormDataMap): void {
    this.onSignalsSdkReady()
      .then(() => window._pingOneSignals.init())
      .then(() => window._pingOneSignals.getData())
      .then(data => {
        (formData as Record<string, string>)['captchaResponse'] = data;
        this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
      });
  }

  onSignalsSdkReady(): Promise<void> {
    return new Promise(resolve => {
      if (window['_pingOneSignalsReady']) {
        resolve();
      } else {
        document.addEventListener('PingOneSignalsReadyEvent', () => resolve());
      }
    });
  }
}
