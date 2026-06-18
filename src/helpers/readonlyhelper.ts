export default function (condition: unknown): string {
  console.log(' got condition: ' + String(condition));
  return condition === undefined || condition === true ? '' : 'readonly';
}
