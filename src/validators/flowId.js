export function isValidFlowId(flowId, maxLength = 30) {
  var re = new RegExp(`^[a-zA-Z0-9]{1,${maxLength}}$`);
  return re.test(flowId);
}
