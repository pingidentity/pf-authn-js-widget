import type { HelperOptions } from 'handlebars';

interface VIPCredential {
  type: string;
  pushEnabled?: boolean;
}

export default function (
  this: unknown,
  vipCredentials: VIPCredential[] | null,
  vipCredentialType: string,
  options: HelperOptions
): string {
  if (vipCredentials === null) {
    return options.fn(this);
  }
  return vipCredentials.some(it => vipCredentialType === it.type)
    ? options.fn(this)
    : options.inverse(this);
}
