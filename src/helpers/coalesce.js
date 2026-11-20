module.exports = function() {
  // Inline-safe helper: returns the first truthy argument. Used for the
  // P14C-88164 target-application-name display: fall back to the default
  // label when no target application name is configured (blank or absent).
  const args = Array.prototype.slice.call(arguments, 0, -1);
  for (let i = 0; i < args.length; i++) {
    if (args[i]) {
      return args[i];
    }
  }
  return '';
};
