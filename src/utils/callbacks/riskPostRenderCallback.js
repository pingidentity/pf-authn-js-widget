import CaptchaUtils from "../riskUtils";

export default (state, store) => {
  // fast fail
  if (!state.showCaptcha)
    return;
  const type = state.captchaProviderType;
  const attributes = state.captchaAttributes;
  const captchaUtils = new CaptchaUtils(type, attributes, store);
  captchaUtils.render();
}