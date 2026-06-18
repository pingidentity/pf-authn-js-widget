import type { HelperOptions } from 'handlebars';

interface VIPCredential {
  type: string;
  pushEnabled?: boolean;
}

export default function (this: unknown, vipCredentials: VIPCredential[] | null, options: HelperOptions): string {
  if (vipCredentials === null) {
    return options.fn(this);
  }
  return vipCredentials.some(it => it.pushEnabled)
    ? options.fn(this)
    : options.inverse(this);
}
