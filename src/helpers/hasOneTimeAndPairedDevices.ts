import type { HelperOptions } from 'handlebars';

interface Device {
  isOneTimeDevice?: boolean;
}

export default function (this: unknown, devices: unknown, options: HelperOptions): string {
  if (!Array.isArray(devices)) {
    return options.inverse(this);
  }

  const deviceList = devices as Device[];
  const hasValidOneTimeDevice = deviceList.some(device => device?.isOneTimeDevice !== true);
  const hasValidPairedDevice = deviceList.some(device => device?.isOneTimeDevice === true);

  if (hasValidOneTimeDevice && hasValidPairedDevice) {
    return options.fn(this);
  }

  return options.inverse(this);
}
