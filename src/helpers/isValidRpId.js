module.exports = function (arg1, options) {
  if (arg1 == null || arg1 == "")
    return options.fn(this);
  var currentDomain = window.location.hostname;
  return (currentDomain.endsWith(arg1)) ? options.fn(this) : options.inverse(this);
};
