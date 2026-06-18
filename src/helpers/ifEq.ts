import type { HelperOptions } from 'handlebars';

export default function (this: unknown, arg1: unknown, arg2: unknown, options: HelperOptions): string {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
}
