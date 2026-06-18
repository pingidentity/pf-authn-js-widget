export function isValidEmail(email: string): boolean {
  const re = /^[\w._-]+([\+\w._-])*@[A-Za-z0-9]+([-\.][A-Za-z0-9]+)*\.[A-Za-z0-9]{2,18}$/;
  return re.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^$|^[\d\-\(\)\s\.]+$|^\+/g.test(phone);
}
