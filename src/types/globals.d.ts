declare interface Window {
  // reCAPTCHA V2 Invisible
  recaptchaV2Invisible_loaded: boolean;
  recaptchaV2Invisible_onload: () => void;
  // reCAPTCHA V3
  recaptchaV3_loaded: boolean;
  recaptchaV3_onload: () => void;
  recaptchaV3_render_result: number;
  // reCAPTCHA Enterprise
  recaptchaEnterprise_loaded: boolean;
  recaptchaEnterprise_onload: () => void;
  recaptchaEnterprise_render_result: number;
  // PingOne Protect / Signals SDK
  signalsSDK_loaded: boolean;
  _pingOneSignals: { init(): Promise<void>; getData(): Promise<string> };
  _pingOneSignalsReady: boolean;
  // Other widget globals
  _securedTouchToken?: string;
  pinghelper?: unknown;
  profileDevice?: unknown;
  transformComponentsToDeviceProfile?: unknown;
}

declare const grecaptcha: {
  render(id: string, opts: object): number;
  execute(token?: number): void;
  getResponse(): string;
  ready(cb: () => void): void;
  enterprise: {
    ready(cb: () => void): void;
    execute(token: number, opts: object): Promise<string>;
    render(id: string, opts: object): number;
  };
};
