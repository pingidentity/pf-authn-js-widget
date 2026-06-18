import RiskUtils from '../riskUtils';
import type { FlowState } from '../../types/state';
import type Store from '../../store';

export default (state: FlowState, _store?: Store): void => {
  if (!(state as Record<string, unknown>).showCaptcha) return;
  const s = state as Record<string, unknown>;
  const type = s.captchaProviderType as string;
  const attributes = s.captchaAttributes as Record<string, string>;
  const riskUtils = new RiskUtils(type, attributes, _store as object);
  riskUtils.render();
};
