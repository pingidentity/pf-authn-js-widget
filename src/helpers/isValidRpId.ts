import type { HelperOptions } from 'handlebars';

export default function (this: unknown, arg1: string | null | undefined, options: HelperOptions): string {
  if (arg1 == null || arg1 === '') return options.fn(this);
  const currentDomain = window.location.hostname;
  return currentDomain.endsWith(arg1) ? options.fn(this) : options.inverse(this);
}
