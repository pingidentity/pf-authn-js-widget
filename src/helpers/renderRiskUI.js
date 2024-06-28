import RiskUtils from "../utils/riskUtils";

module.exports = function (options) {
  if (!options.data.root.showCaptcha) 
    return;
  console.log("rendering captcha")
  const type = options.data.root.captchaProviderType;
  const attributes = options.data.root.captchaAttributes;
  const store = options.data.root.store;
  const riskUtils = new RiskUtils(type, attributes, store);
  const uiElement = riskUtils.renderUIElement();
  if (uiElement) 
    return uiElement;
  // fallback, nothing to return
};