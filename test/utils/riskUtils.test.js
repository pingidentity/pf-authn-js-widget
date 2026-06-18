import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import RiskUtils from '../../src/utils/riskUtils';

vi.mock('../../src/utils/risk-providers/recaptcha-v2-invisible', () => ({
  default: vi.fn(),
}));
vi.mock('../../src/utils/risk-providers/recaptcha-v3', () => ({
  default: vi.fn(),
}));
vi.mock('../../src/utils/risk-providers/recaptcha-enterprise', () => ({
  default: vi.fn(),
}));
vi.mock('../../src/utils/risk-providers/signals', () => ({
  default: vi.fn(),
}));

import RecaptchaV2Invisible from '../../src/utils/risk-providers/recaptcha-v2-invisible';
import RecaptchaV3 from '../../src/utils/risk-providers/recaptcha-v3';
import RecaptchaEnterprise from '../../src/utils/risk-providers/recaptcha-enterprise';
import Signals from '../../src/utils/risk-providers/signals';

const TYPES = {
  RECAPTCHA_V2_INVISIBLE: 'reCAPTCHA v2 Invisible',
  RECAPTCHA_V3: 'reCAPTCHA v3',
  RECAPTCHA_ENTERPRISE: 'reCAPTCHA Enterprise',
  PING_ONE_PROTECT_OLD: 'PingOne Protect Provider',
  PING_ONE_PROTECT: 'PingOne Protect',
};

const makeImpl = () => ({
  getUIElement: vi.fn().mockReturnValue('<div id="captcha"></div>'),
  render: vi.fn(),
  execute: vi.fn(),
});

describe('RiskUtils', () => {
  let attributes;
  let store;
  let impl;

  beforeEach(() => {
    attributes = { siteKey: 'test-key', action: 'login' };
    store = { dispatch: vi.fn(), savePendingState: vi.fn() };
    impl = makeImpl();

    RecaptchaV2Invisible.mockImplementation(() => impl);
    RecaptchaV3.mockImplementation(() => impl);
    RecaptchaEnterprise.mockImplementation(() => impl);
    Signals.mockImplementation(() => impl);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('#getImplementation — correct class per type', () => {
    test.each([
      [TYPES.RECAPTCHA_V2_INVISIBLE, RecaptchaV2Invisible],
      [TYPES.RECAPTCHA_V3, RecaptchaV3],
      [TYPES.RECAPTCHA_ENTERPRISE, RecaptchaEnterprise],
      [TYPES.PING_ONE_PROTECT_OLD, Signals],
      [TYPES.PING_ONE_PROTECT, Signals],
    ])('type "%s" instantiates the right provider', (type, Constructor) => {
      const utils = new RiskUtils(type, attributes, store);
      utils.render();
      expect(Constructor).toHaveBeenCalledWith(attributes, store);
    });

    test('unsupported type throws an error', () => {
      const utils = new RiskUtils('unknown-type', attributes, store);
      expect(() => utils.render()).toThrow("Captcha type 'unknown-type' is not supported");
    });
  });

  describe('renderUIElement()', () => {
    test.each(Object.values(TYPES))('returns a SafeString wrapping the UI element for "%s"', (type) => {
      const utils = new RiskUtils(type, attributes, store);
      const result = utils.renderUIElement();
      expect(impl.getUIElement).toHaveBeenCalled();
      expect(result.toString()).toBe('<div id="captcha"></div>');
    });

    test('unsupported type throws from renderUIElement', () => {
      const utils = new RiskUtils('bad-type', attributes, store);
      expect(() => utils.renderUIElement()).toThrow("Captcha type 'bad-type' is not supported");
    });
  });

  describe('render()', () => {
    test.each(Object.values(TYPES))('delegates to impl.render() for "%s"', (type) => {
      const utils = new RiskUtils(type, attributes, store);
      utils.render();
      expect(impl.render).toHaveBeenCalledOnce();
    });

    test('unsupported type throws from render', () => {
      const utils = new RiskUtils('bad-type', attributes, store);
      expect(() => utils.render()).toThrow("Captcha type 'bad-type' is not supported");
    });
  });

  describe('execute()', () => {
    test.each(Object.values(TYPES))('delegates to impl.execute() with actionId and formData for "%s"', (type) => {
      const utils = new RiskUtils(type, attributes, store);
      const formData = { username: 'alice' };
      utils.execute('action-123', formData);
      expect(impl.execute).toHaveBeenCalledWith('action-123', formData);
    });

    test('unsupported type throws from execute', () => {
      const utils = new RiskUtils('bad-type', attributes, store);
      expect(() => utils.execute('action-123', {})).toThrow("Captcha type 'bad-type' is not supported");
    });
  });

  describe('constructor', () => {
    test('stores type, attributes, and store', () => {
      const utils = new RiskUtils(TYPES.RECAPTCHA_V3, attributes, store);
      expect(utils.type).toBe(TYPES.RECAPTCHA_V3);
      expect(utils.attributes).toBe(attributes);
      expect(utils.store).toBe(store);
    });
  });
});
