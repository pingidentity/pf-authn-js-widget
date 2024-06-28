import handlebars from 'handlebars'
import RecaptchaV2Invisible from "./risk-providers/recaptcha-v2-invisible";
import RecaptchaV3 from "./risk-providers/recaptcha-v3";
import Signals from "./risk-providers/signals";

const CAPTCHA_TYPE_RECAPTCHA_V2_INVISIBLE = "reCAPTCHA v2 Invisible";
const CAPTCHA_TYPE_RECAPTHCA_V3 = "reCAPTCHA v3";
const CAPTCHA_TYPE_PING_ONE_PROTECT_OLD_NAME = "PingOne Protect Provider";
const CAPTCHA_TYPE_PING_ONE_PROTECT = "PingOne Protect";

export default class RiskUtils {
  constructor(type, attributes, store) {
    this.type = type;
    this.attributes = attributes;
    this.store = store;
  }

  renderUIElement() {
    const impl = this.#getImplementation();
    const uiElement = impl.getUIElement();
    return new handlebars.SafeString(uiElement);
  }

  render() {
    const impl = this.#getImplementation();
    impl.render();
  }

  execute(actionId, formData) {
    const impl = this.#getImplementation();
    impl.execute(actionId, formData);
  }

  #getImplementation() {
    switch (this.type) {
      case CAPTCHA_TYPE_RECAPTCHA_V2_INVISIBLE:
        return new RecaptchaV2Invisible(this.attributes, this.store);
      case CAPTCHA_TYPE_RECAPTHCA_V3:
        return new RecaptchaV3(this.attributes, this.store);
      case CAPTCHA_TYPE_PING_ONE_PROTECT_OLD_NAME:
      case CAPTCHA_TYPE_PING_ONE_PROTECT:
        return new Signals(this.attributes, this.store);
      default:
        throw new Error(`Captcha type '${this.type}' is not supported`)
    }
  }
}