import 'regenerator-runtime/runtime';

export interface AuthnWidgetLike {
  store: {
    getStore(): Record<string, unknown>;
    dispatch(method: string, actionId: string, body: string): Promise<void>;
    getFormData?: () => Record<string, unknown>;
  };
  getFormData(): Record<string, unknown>;
}

function isWebAuthnSupported(): boolean {
  if (!window.PublicKeyCredential) {
    console.log('Web Authentication API is not supported on this browser.');
    return false;
  }
  return true;
}

function isWebAuthnPlatformAuthenticatorAvailable(): Promise<boolean> {
  const p1 = new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), 1000);
    void timer;
  });
  const p2 = new Promise<boolean>(resolve => {
    if (
      isWebAuthnSupported() &&
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      resolve(
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(err => {
          console.log(err);
          return false;
        })
      );
    } else {
      resolve(false);
    }
  });
  return Promise.race([p1, p2]);
}

function credentialListConversion(list: Array<{ type: string; id: number[]; transports?: string[] }>): PublicKeyCredentialDescriptor[] {
  return list.map(item => {
    const cred: PublicKeyCredentialDescriptor = {
      type: item.type as PublicKeyCredentialType,
      id: new Uint8Array(item.id),
    };
    if (item.transports) {
      (cred as unknown as { transports: string[] }).transports = item.transports;
    }
    return cred;
  });
}

function toBase64Str(bin: ArrayBuffer | null): string {
  if (!bin) return '';
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(bin))));
}

const isWebAuthnSupportedFn = (): boolean => !!window.PublicKeyCredential;

export function getCompatibility(): Promise<'FULL' | 'SECURITY_KEY_ONLY' | 'NONE'> {
  return isWebAuthnPlatformAuthenticatorAvailable()
    .then(result => {
      if (result) return 'FULL' as const;
      if (isWebAuthnSupportedFn()) return 'SECURITY_KEY_ONLY' as const;
      return 'NONE' as const;
    })
    .catch(() => {
      if (isWebAuthnSupportedFn()) return 'SECURITY_KEY_ONLY' as const;
      return 'NONE' as const;
    });
}

function checkAssertion(publicKeyCredential: string, authnWidget: AuthnWidgetLike): void {
  (document.querySelector('#assertion') as HTMLInputElement).value = publicKeyCredential;
  getCompatibility().then(value => {
    (document.querySelector('#compatibility') as HTMLInputElement).value = value;
    (document.querySelector('#origin') as HTMLInputElement).value = window.location.origin;
    const formData = authnWidget.getFormData();
    authnWidget.store.dispatch('POST_FLOW', 'checkAssertion', JSON.stringify(formData));
  });
}

function activateFIDODevice(
  publicKeyCredential: string,
  authnWidget: AuthnWidgetLike,
  deviceType: 'PLATFORM' | 'SECURITY_KEY' | 'FIDO2'
): void {
  (document.querySelector('#attestation') as HTMLInputElement).value = publicKeyCredential;
  (document.querySelector('#origin') as HTMLInputElement).value = window.location.origin;
  const formData = authnWidget.getFormData();
  const actionMap: Record<string, string> = {
    PLATFORM: 'activatePlatformDevice',
    SECURITY_KEY: 'activateSecurityKeyDevice',
    FIDO2: 'activateFido2Device',
  };
  authnWidget.store.dispatch('POST_FLOW', actionMap[deviceType], JSON.stringify(formData));
}

export function doWebAuthn(authnWidget: AuthnWidgetLike): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = authnWidget.store.getStore();
    const options = data.publicKeyCredentialRequestOptions as Record<string, unknown>;
    const publicKeyCredential: PublicKeyCredentialRequestOptions = {
      challenge: new Uint8Array(options.challenge as number[]),
    };
    if ('allowCredentials' in options) {
      publicKeyCredential.allowCredentials = credentialListConversion(
        options.allowCredentials as Array<{ type: string; id: number[]; transports?: string[] }>
      );
    }
    if ('rpId' in options) publicKeyCredential.rpId = options.rpId as string;
    if ('timeout' in options) publicKeyCredential.timeout = options.timeout as number;
    if ('userVerification' in options)
      publicKeyCredential.userVerification = options.userVerification as UserVerificationRequirement;

    navigator.credentials
      .get({ publicKey: publicKeyCredential })
      .then(assertion => {
        if (!assertion) { reject(new Error('No assertion returned')); return; }
        const a = assertion as PublicKeyCredential;
        const response = a.response as AuthenticatorAssertionResponse;
        const result: Record<string, unknown> = {};
        if ('id' in a) result.id = a.id;
        if ('rawId' in a) result.rawId = toBase64Str(a.rawId);
        if ('type' in a) result.type = a.type;
        result.response = {
          clientDataJSON: toBase64Str(response.clientDataJSON),
          authenticatorData: toBase64Str(response.authenticatorData),
          signature: toBase64Str(response.signature),
          userHandle: toBase64Str(response.userHandle),
        };
        const json = JSON.stringify(result);
        resolve(json);
        checkAssertion(json, authnWidget);
      })
      .catch(err => {
        console.log('No acceptable authenticator or user refused consent');
        const devices = data.devices as unknown[];
        if (devices && devices.length === 1) {
          (document.querySelector('#assertionRequiredSpinnerId') as HTMLElement).style.display = 'none';
          (document.querySelector('#assertionRequiredAuthenticatingId') as HTMLElement).style.display = 'none';
          (document.querySelector('#consentRefusedId') as HTMLElement).style.display = 'block';
          (document.querySelector('#changeDevice') as HTMLElement).style.display = 'none';
          (document.querySelector('#deviceInfoBlockId') as HTMLElement).style.display = 'none';
        } else {
          (document.querySelector('#assertionRequiredSpinnerId') as HTMLElement).style.display = 'none';
          (document.querySelector('#assertionRequiredAuthenticatingId') as HTMLElement).style.display = 'none';
          (document.querySelector('#consentRefusedId') as HTMLElement).style.display = 'block';
        }
        reject(err);
      });
  });
}

export function doRegisterWebAuthn(authnWidget: AuthnWidgetLike, status: string): Promise<string> {
  const authAbortController = window.PublicKeyCredential ? new AbortController() : null;
  const authAbortSignal = authAbortController ? authAbortController.signal : null;

  return new Promise((resolve, reject) => {
    const data = authnWidget.store.getStore();
    const options = JSON.parse(data.publicKeyCredentialCreationOptions as string) as Record<string, unknown>;
    const publicKeyCredential: PublicKeyCredentialCreationOptions = {
      rp: options.rp as PublicKeyCredentialRpEntity,
      user: {
        ...(options.user as PublicKeyCredentialUserEntity),
        id: new Uint8Array((options.user as { id: number[] }).id),
      },
      challenge: new Uint8Array(options.challenge as number[]),
      pubKeyCredParams: options.pubKeyCredParams as PublicKeyCredentialParameters[],
    };
    if ('timeout' in options) publicKeyCredential.timeout = options.timeout as number;
    if ('excludeCredentials' in options)
      publicKeyCredential.excludeCredentials = credentialListConversion(
        options.excludeCredentials as Array<{ type: string; id: number[]; transports?: string[] }>
      );
    if ('authenticatorSelection' in options)
      publicKeyCredential.authenticatorSelection = options.authenticatorSelection as AuthenticatorSelectionCriteria;
    if ('attestation' in options)
      publicKeyCredential.attestation = options.attestation as AttestationConveyancePreference;
    if ('extensions' in options)
      publicKeyCredential.extensions = options.extensions as AuthenticationExtensionsClientInputs;

    const createOptions: CredentialCreationOptions = { publicKey: publicKeyCredential };
    if (authAbortSignal) createOptions.signal = authAbortSignal;

    navigator.credentials
      .create(createOptions)
      .then(newCredentialInfo => {
        if (!newCredentialInfo) { reject(new Error('No credential info returned')); return; }
        const nc = newCredentialInfo as PublicKeyCredential;
        const ncResponse = nc.response as AuthenticatorAttestationResponse;
        const result: Record<string, unknown> = {};
        if ('id' in nc) result.id = nc.id;
        if ('type' in nc) result.type = nc.type;
        if ('rawId' in nc) result.rawId = toBase64Str(nc.rawId);
        if (!ncResponse) throw new Error("Missing 'response' attribute in credential response");
        result.response = {
          clientDataJSON: toBase64Str(ncResponse.clientDataJSON),
          attestationObject: toBase64Str(ncResponse.attestationObject),
        };
        const json = JSON.stringify(result);
        resolve(json);
        const deviceType = status === 'PLATFORM_ACTIVATION_REQUIRED'
          ? 'PLATFORM'
          : status === 'SECURITY_KEY_ACTIVATION_REQUIRED'
            ? 'SECURITY_KEY'
            : 'FIDO2';
        activateFIDODevice(json, authnWidget, deviceType);
      })
      .catch(err => {
        console.log(err);
        (document.querySelector('#platform_icon_container_id') as HTMLElement).style.display = 'none';
        (document.querySelector('#attestationRequiredId') as HTMLElement).style.display = 'none';
        (document.querySelector('#unsupportedDeviceId') as HTMLElement).style.display = 'none';
        (document.querySelector('#consentRefusedId') as HTMLElement).style.display = 'block';
        reject(err);
      });
  });
}
