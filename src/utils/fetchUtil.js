export default class fetchUtil {
  constructor(baseUrl, useActionParam=false) {
    this.baseUrl = baseUrl;
    this.useActionParam = useActionParam;
  }

  doRequest(method, flowId, actionId, body) {
    var FLOWS_ENDPOINT = '/pf-ws/authn/flows/';
    var url = this.baseUrl + FLOWS_ENDPOINT + flowId;
    var headers = {
      Accept: 'application/json',
      'X-XSRF-Header': 'PingFederate'
    };
    if (actionId) {
      var contentType = 'application/json';
      if (this.useActionParam) {
        url = url + '?action=' + actionId;
      }
      else {
        contentType = 'application/vnd.pingidentity.' + actionId + '+json';
      }
      headers['Content-Type'] = contentType;
    }
    var options = {
      headers: headers,
      method: method,
      body: body,
      credentials: 'include'
    }
    return fetch(url, options);
  }

  getFlow(flowId) {
    return this.doRequest('GET', flowId);
  }

  postFlow(flowId, actionId, body) {
    return this.doRequest('POST', flowId, actionId, body);
  }
}
