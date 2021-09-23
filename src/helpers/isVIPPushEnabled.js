module.exports = function (vipCredentials, options) {
  if (vipCredentials === null) {
    return options.fn(this);
  }
  return (vipCredentials.some(function (it) {
    return it.pushEnabled;
  })) ? options.fn(this) : options.inverse(this);
};
