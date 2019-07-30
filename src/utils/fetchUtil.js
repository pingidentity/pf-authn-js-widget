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
  return fetch(url, options);
}

export function getFlow(baseUrl, flowId) {
  return doRequest(baseUrl, 'GET', flowId);
}

export function postFlow(baseUrl, flowId, actionId, body) {
  var customContentType = 'application/vnd.pingidentity.' + actionId + '+json';
  return doRequest(baseUrl, 'POST', flowId, customContentType, body);
}
