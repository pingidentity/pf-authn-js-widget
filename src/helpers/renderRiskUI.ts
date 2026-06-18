import RiskUtils from '../utils/riskUtils';
import type { SafeString } from 'handlebars';

interface RiskHelperOptions {
  data: {
    root: {
      showCaptcha?: boolean;
      captchaProviderType: string;
      captchaAttributes: Record<string, string>;
      store: object;
    };
  };
}

export default function (options: RiskHelperOptions): SafeString | undefined {
  if (!options.data.root.showCaptcha) return;
  console.log('rendering captcha');
  const type = options.data.root.captchaProviderType;
  const attributes = options.data.root.captchaAttributes;
  const store = options.data.root.store;
  const riskUtils = new RiskUtils(type, attributes, store);
  const uiElement = riskUtils.renderUIElement();
  if (uiElement) return uiElement;
}
