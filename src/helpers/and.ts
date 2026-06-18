export default function (...args: unknown[]): boolean {
  return args.slice(0, -1).every(Boolean);
}
