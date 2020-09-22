var handlebars = require('handlebars');
var fs = require('fs');
const path = require('path');

exports.renderIndex = function (res, options = {}) {
  var data = {
    baseUrl: options.baseUrl || 'https://localhost:9031',
    redirectless: 'redirectless' === options.operationMode,
  }
  fs.readFile(path.join(__dirname, 'index-template.handlebars'), 'utf-8', function (err, src) {
    var template = handlebars.compile(src);
    var html = template(data)
    res.send(html);
  });
}
