module.exports = function() {
  // Inline-safe (subexpression) helper: returns a boolean instead of using
  // options.fn/options.inverse, so it works in {{#if (gt a b)}} contexts.
  const args = Array.prototype.slice.call(arguments, 0, -1);
  const arg1 = args[0];
  const arg2 = args[1];
  return Number(arg1) > Number(arg2);
};
