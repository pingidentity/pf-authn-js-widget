const templates = require('./templates/index.cjs');

export default function(server, options = {}) {
  server.app.get('/', function (req, res) {
    templates.renderIndex(res, options);
  });
}
