declare module "@ping-identity/pf-authn-js-widget"

export interface IRedirectlessConfig {
  client_id?: string,
  response_type?: string,
  onAuthorizationSuccess: (response: Response) => void,
  onAuthorizationFailed?: (response: Response) => void,
  onAuthorizationRequest?: () => Promise<Response>,
  scopes?: string[],
  state?: string
}

export interface IOptions {
  divId: string,
  flowId?: string,
  flowIdMaxLength?: number,
  logo?: string,
  useActionParam?: boolean,
  deviceProfileScript?: string
}

/** Remember Me state models (PingOne MFA IK 4.2, P14C-82959).
 *  EVALUATE_REMEMBER_ME_DEVICE / MANAGE_REMEMBER_ME_DEVICE carry the profiling
 *  timeout; the widget profiles the browser with the PingOne Signals SDK and
 *  POSTs submitDeviceInformation { browserFingerprint }. */
export interface IRememberMeDeviceProfilingDetails {
  deviceProfileTimeoutMillis?: number
}

export interface IAuthnWidget {
  init(): void;
  initRedirectless(redirectlessConfig: IRedirectlessConfig): void;
  clearPendingState(): void;
}

export default class AuthnWidget implements IAuthnWidget {
  constructor(baseUrl: string, options: IOptions);
  init(): void;
  initRedirectless(redirectlessConfig: IRedirectlessConfig): void;
  clearPendingState(): void;
}