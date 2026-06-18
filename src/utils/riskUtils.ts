import handlebars from 'handlebars';
import RecaptchaV2Invisible from './risk-providers/recaptcha-v2-invisible';
import RecaptchaV3 from './risk-providers/recaptcha-v3';
import RecaptchaEnterprise from './risk-providers/recaptcha-enterprise';
import Signals from './risk-providers/signals';
import type { RiskAttributes, RiskProvider } from '../types/risk';
import type { FormDataMap } from '../types/state';

const CAPTCHA_TYPE_RECAPTCHA_V2_INVISIBLE = 'reCAPTCHA v2 Invisible';
const CAPTCHA_TYPE_RECAPTCHA_V3 = 'reCAPTCHA v3';
const CAPTCHA_TYPE_RECAPTCHA_ENTERPRISE = 'reCAPTCHA Enterprise';
const CAPTCHA_TYPE_PING_ONE_PROTECT_OLD_NAME = 'PingOne Protect Provider';
const CAPTCHA_TYPE_PING_ONE_PROTECT = 'PingOne Protect';

export default class RiskUtils {
  type: string;
  attributes: RiskAttributes;
  store: object;

  constructor(type: string, attributes: RiskAttributes, store: object) {
    this.type = type;
    this.attributes = attributes;
    this.store = store;
  }

  renderUIElement(): handlebars.SafeString {
    const impl = this.#getImplementation();
    const uiElement = impl.getUIElement();
    return new handlebars.SafeString(uiElement);
  }

  render(): void {
    const impl = this.#getImplementation();
    impl.render();
  }

  execute(actionId: string, formData: FormDataMap): void {
    const impl = this.#getImplementation();
    impl.execute(actionId, formData);
  }

  #getImplementation(): RiskProvider {
    switch (this.type) {
      case CAPTCHA_TYPE_RECAPTCHA_V2_INVISIBLE:
        return new RecaptchaV2Invisible(this.attributes, this.store as ConstructorParameters<typeof RecaptchaV2Invisible>[1]);
      case CAPTCHA_TYPE_RECAPTCHA_V3:
        return new RecaptchaV3(this.attributes, this.store as ConstructorParameters<typeof RecaptchaV3>[1]);
      case CAPTCHA_TYPE_RECAPTCHA_ENTERPRISE:
        return new RecaptchaEnterprise(this.attributes, this.store as ConstructorParameters<typeof RecaptchaEnterprise>[1]);
      case CAPTCHA_TYPE_PING_ONE_PROTECT_OLD_NAME:
      case CAPTCHA_TYPE_PING_ONE_PROTECT:
        return new Signals(this.attributes, this.store as ConstructorParameters<typeof Signals>[1]);
      default:
        throw new Error(`Captcha type '${this.type}' is not supported`);
    }
  }
}
