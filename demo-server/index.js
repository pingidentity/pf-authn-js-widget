const templates = require('./templates');

module.exports = function (server, options = {}) {
  server.app.get('/', function (req, res) {
    templates.renderIndex(res, options)
  });
}
