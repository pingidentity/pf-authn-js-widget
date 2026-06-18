export function isValidFlowId(flowId: string, maxLength = 30): boolean {
  const re = new RegExp(`^[a-zA-Z0-9]{1,${maxLength}}$`);
  return re.test(flowId);
}
