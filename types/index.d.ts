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
  deviceProfileScript?: string,
  /** Display name of the application the user is authenticating to (P14C-88164).
   *  Rendered on authentication screens in place of the default device-type
   *  labels; overrides the targetApplicationName the IK returns in state. */
  targetApplicationName?: string
}

export interface IAuthnWidget {
  init(): void;
  initRedirectless(redirectlessConfig: IRedirectlessConfig): void;
  clearPendingState(): void;
}

/** Adapter "Show Screens" settings surfaced on MFA state models (issue #154).
 *  When a flag is false the widget skips that screen and advances the flow
 *  (Cancel on error states, Continue on MFA_COMPLETED) so PingFederate moves
 *  to the next adapter in the policy chain. */
export interface IScreenDisplayFlags {
  /** MFA_FAILED / MFA_DENIED / PUSH_CONFIRMATION_REJECTED /
   *  MFA_DEVICE_PAIRING_METHOD_FAILED */
  displayErrorScreen?: boolean,
  /** PUSH_CONFIRMATION_TIMED_OUT */
  displayTimeoutScreen?: boolean,
  /** MFA_COMPLETED */
  displaySuccessScreen?: boolean
}

export default class AuthnWidget implements IAuthnWidget {
  constructor(baseUrl: string, options: IOptions);
  init(): void;
  initRedirectless(redirectlessConfig: IRedirectlessConfig): void;
  clearPendingState(): void;
}