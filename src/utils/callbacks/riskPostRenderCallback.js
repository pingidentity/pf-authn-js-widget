import RiskUtils from "../riskUtils";

export default (state, store) => {
  // fast fail
  if (!state.showCaptcha)
    return;
  const type = state.captchaProviderType;
  const attributes = state.captchaAttributes;
  const riskUtils = new RiskUtils(type, attributes, store);
  riskUtils.render();
}