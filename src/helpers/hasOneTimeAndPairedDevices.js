module.exports = function (devices, options) {
  if (!Array.isArray(devices)) {
    return options.inverse(this);
  }

  const hasValidOneTimeDevice = devices.some(device => device?.isOneTimeDevice !== true);
  const hasValidPairedDevice = devices.some(device => device?.isOneTimeDevice === true);

  if (hasValidOneTimeDevice && hasValidPairedDevice) {
    return options.fn(this);
  }

  return options.inverse(this);
};