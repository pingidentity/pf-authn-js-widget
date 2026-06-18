import type { RiskAttributes, RiskProvider } from '../../types/risk';
import type { FormDataMap } from '../../types/state';

const LOG_PREFIX = '[reCAPTCHA V2 Invisible] ';

export default class RecaptchaV2Invisible implements RiskProvider {
  attributes: RiskAttributes;
  store: { savePendingState(action: string, actionId: string, formData: FormDataMap): void };

  constructor(
    attributes: RiskAttributes,
    store: { savePendingState(action: string, actionId: string, formData: FormDataMap): void }
  ) {
    this.attributes = attributes;
    this.store = store;
    window.recaptchaV2Invisible_loaded = window.recaptchaV2Invisible_loaded || false;
    if (window.recaptchaV2Invisible_loaded) {
      console.log(LOG_PREFIX + 'already initialized, skipping initialization');
      return;
    }
    window.recaptchaV2Invisible_onload = () => {
      console.log(LOG_PREFIX + 'script onload event triggered');
      window.recaptchaV2Invisible_loaded = true;
      renderCaptcha(this.attributes.siteKey!, this.store);
    };
  }

  isLoaded(): boolean {
    return window.recaptchaV2Invisible_loaded;
  }

  getScriptHeader(): HTMLScriptElement {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaV2Invisible_onload&render=explicit';
    script.setAttribute('async', '');
    script.setAttribute('defer', '');
    return script;
  }

  getUIElement(): string {
    return '<div id="invisibleRecaptchaId"></div>';
  }

  render(): void {
    if (this.isLoaded()) {
      console.log(LOG_PREFIX + 'script is loaded, rendering');
      renderCaptcha(this.attributes.siteKey!, this.store);
      return;
    }
    console.log(LOG_PREFIX + 'loading script');
    document.head.appendChild(this.getScriptHeader());
  }

  execute(actionId: string, formData: FormDataMap): void {
    this.store.savePendingState('POST_FLOW', actionId, formData);
    grecaptcha.execute();
  }
}

const renderCaptcha = (
  siteKey: string,
  store: { savePendingState(action: string, actionId: string, formData: FormDataMap): void }
): void => {
  grecaptcha.render('invisibleRecaptchaId', {
    sitekey: siteKey,
    badge: 'bottomright',
    callback: () => {
      console.log(LOG_PREFIX + 'executing callback');
      const captchaResponse = grecaptcha.getResponse();
      if (captchaResponse.length === 0) {
        console.log(LOG_PREFIX + 'invalid response, try again.');
        (store as unknown as { clearPendingState(): void }).clearPendingState();
      } else {
        console.log(LOG_PREFIX + `captcha response: ${captchaResponse}`);
        (store as unknown as { dispatchPendingState(extra: Record<string, string>): void })
          .dispatchPendingState({ captchaResponse });
      }
    },
    size: 'invisible',
  });
};
