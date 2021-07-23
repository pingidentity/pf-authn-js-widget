declare module "@ping-identity/pf-authn-js-widget"

export interface IAuthnWidget {
  init(): void;
  initRedirectless(redirectlessConfig: any): void
}

export default class AuthnWidget implements IAuthnWidget {
  constructor(baseUrl: string, options: any);
  init(): void;
  initRedirectless(redirectlessConfig: any): void
}