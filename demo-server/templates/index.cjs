const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

exports.renderIndex = function (res, options = {}) {
  var data = {
    baseUrl: options.baseUrl || 'https://localhost:9031',
    redirectless: 'redirectless' === options.operationMode,
  }

  fs.readFile(path.join(__dirname, 'index-template.handlebars'), 'utf-8', function (err, src) {
;    if (err) {
      res.statusCode = 500;
      res.end('Unable to render demo page.');
      return;
    }

    var template = handlebars.compile(src);
    let html = template(data);
    if (options.useViteDevBundle) {
      html = html
        .replace('<script src="./pf.authn-widget.js"></script>', '<script type="module" src="/demo-server/dev-entry.js"></script>')
        .replace("<script type='application/json' src=\"./pf.authn-widget.map\"></script>", '');
    }

    if (typeof res.send === 'function') {
      res.send(html);
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
}
