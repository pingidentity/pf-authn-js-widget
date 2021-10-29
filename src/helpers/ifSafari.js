const {isSafari} = require("../utils/browsers");
module.exports = function (options) {
  return isSafari() ? options.fn(this) : options.inverse(this);
};
