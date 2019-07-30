function AuthnApiError(err) {
  this.name = 'AuthnApiError';
  this.message = err.errorSummary;
}

AuthnApiError.prototype = new Error();

module.exports = AuthnApiError;
