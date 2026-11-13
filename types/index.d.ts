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

export default class AuthnWidget implements IAuthnWidget {
  constructor(baseUrl: string, options: IOptions);
  init(): void;
  initRedirectless(redirectlessConfig: IRedirectlessConfig): void;
  clearPendingState(): void;
}