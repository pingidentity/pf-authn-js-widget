import type { RiskAttributes, RiskProvider } from '../../types/risk';
import type { FormDataMap } from '../../types/state';

const LOG_PREFIX = '[reCAPTCHA Enterprise] ';

interface StoreWithDispatch {
  dispatch(action: string, actionId: string, body: string): void;
}

export default class RecaptchaEnterprise implements RiskProvider {
  attributes: RiskAttributes;
  store: StoreWithDispatch;

  constructor(attributes: RiskAttributes, store: StoreWithDispatch) {
    this.attributes = attributes;
    this.store = store;
    window.recaptchaEnterprise_loaded = window.recaptchaEnterprise_loaded || false;
    if (window.recaptchaEnterprise_loaded) {
      console.log(LOG_PREFIX + 'already initialized, skipping initialization');
      return;
    }
    window.recaptchaEnterprise_onload = () => {
      console.log(LOG_PREFIX + 'script onload event triggered');
      window.recaptchaEnterprise_loaded = true;
      renderCaptcha(this.attributes.siteKey!);
    };
  }

  isLoaded(): boolean {
    return window.recaptchaEnterprise_loaded;
  }

  getScriptHeader(): HTMLScriptElement {
    const script = document.createElement('script');
    script.src =
      'https://www.google.com/recaptcha/enterprise.js?onload=recaptchaEnterprise_onload&render=explicit';
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
    grecaptcha.enterprise.ready(() => {
      grecaptcha.enterprise
        .execute(window.recaptchaEnterprise_render_result, { action: this.attributes.action })
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
  window.recaptchaEnterprise_render_result = grecaptcha.enterprise.render('invisibleRecaptchaId', {
    sitekey: siteKey,
    size: 'invisible',
  });
};
