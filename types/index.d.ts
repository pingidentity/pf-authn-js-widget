declare module "@ping-identity/pf-authn-js-widget"

export interface RedirectlessConfig {
  client_id: string,
  response_type: string,
  onAuthorizationSuccess(response: any): void,
  scopes?: string[],
  state?: string
}

export interface IAuthnWidget {
  init(): void;
  initRedirectless(redirectlessConfig: any): void
}

export default class AuthnWidget implements IAuthnWidget {
  constructor(baseUrl: string, options: Options);
  init(): void;
  initRedirectless(redirectlessConfig: RedirectlessConfig): void
}