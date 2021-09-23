module.exports = function (vipCredentials, vipCredentialType, options) {
  if (vipCredentials === null) {
    return options.fn(this);
  }
  return (vipCredentials.some(function (it) {
    return vipCredentialType === it.type;
  })) ? options.fn(this) : options.inverse(this);
};
