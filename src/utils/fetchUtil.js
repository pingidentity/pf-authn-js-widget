var AuthnApiError = require('../errors/AuthnApiError');
var ResultData = require('../ResultData');

function doRequest(baseUrl, method, flowId, contentType, body) {
  var FLOWS_ENDPOINT = '/pf-ws/authn/flows/';
  var headers = {
    Accept: 'application/json',
    'X-XSRF-Header': 'PingFederate',
    'Content-Type': contentType
  };

  var options = {
    headers: headers,
    method: method,
    body: body,
    credentials: 'include'
  }
  var url = baseUrl + FLOWS_ENDPOINT + flowId;
  var jsonPromise = fetch(url, options);
  var jsonData = jsonPromise.then(function (response) {
    return response;
  });
  return Promise.all([jsonPromise, jsonData]).then(function (values) {
    var response = values[0];
    return Promise.resolve(new ResultData(response.status, values[1]));
  }).catch(function (err) {
    throw new AuthnApiError(err);
  });
}

export function getFlow(baseUrl, flowId) {
  return doRequest(baseUrl, 'GET', flowId);
}

export function postFlow(baseUrl, flowId, actionId, body) {
  var customContentType = 'application/vnd.pingidentity.' + actionId + '+json';
  return doRequest(baseUrl, 'POST', flowId, customContentType, body);
}
