export function isSafari() {
  const vendor = navigator.vendor.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  return vendor.includes('apple') && userAgent.includes('safari');
}
