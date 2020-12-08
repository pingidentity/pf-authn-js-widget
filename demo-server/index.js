const templates = require('./templates');

module.exports = function (app, server, options = {}) {
  app.get('/', function (req, res) {
    templates.renderIndex(res, options)
  });
}
