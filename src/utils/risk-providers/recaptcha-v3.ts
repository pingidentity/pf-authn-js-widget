import type { RiskAttributes, RiskProvider } from '../../types/risk';
import type { FormDataMap } from '../../types/state';

const LOG_PREFIX = '[reCAPTCHA V3] ';

interface StoreWithDispatch {
  dispatch(action: string, actionId: string, body: string): void;
}

export default class RecaptchaV3 implements RiskProvider {
  attributes: RiskAttributes;
  store: StoreWithDispatch;

  constructor(attributes: RiskAttributes, store: StoreWithDispatch) {
    this.attributes = attributes;
    this.store = store;
    window.recaptchaV3_loaded = window.recaptchaV3_loaded || false;
    if (window.recaptchaV3_loaded) {
      console.log(LOG_PREFIX + 'already initialized, skipping initialization');
      return;
    }
    window.recaptchaV3_onload = () => {
      console.log(LOG_PREFIX + 'script onload event triggered');
      window.recaptchaV3_loaded = true;
      renderCaptcha(this.attributes.siteKey!);
    };
  }

  isLoaded(): boolean {
    return window.recaptchaV3_loaded;
  }

  getScriptHeader(): HTMLScriptElement {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaV3_onload&render=explicit';
    script.setAttribute('async', '');
    script.setAttribute('defer', '');
    return script;
  }

  getUIElement(): string {
    return '<div id="invisibleRecaptchaId"></div>';
  }

  render(): void {
    if (this.isLoaded()) {
      console.log(LOG_PREFIX + 'script is loaded.');
      renderCaptcha(this.attributes.siteKey!);
      return;
    }
    console.log(LOG_PREFIX + 'loading script');
    document.head.appendChild(this.getScriptHeader());
  }

  execute(actionId: string, formData: FormDataMap): void {
    grecaptcha.ready(() => {
      grecaptcha.enterprise
        .execute(window.recaptchaV3_render_result, { action: this.attributes.action })
        .then(token => {
          console.log(LOG_PREFIX + `captcha response: ${token}`);
          (formData as Record<string, string>)['captchaResponse'] = token;
          console.log(LOG_PREFIX + `${String(formData)}`);
          this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
        });
    });
  }
}

const renderCaptcha = (siteKey: string): void => {
  console.log(LOG_PREFIX + 'rendering');
  window.recaptchaV3_render_result = grecaptcha.render('invisibleRecaptchaId', {
    sitekey: siteKey,
    size: 'invisible',
  });
};
