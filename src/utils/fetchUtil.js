import 'whatwg-fetch';
export default class fetchUtil {

  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  doRequest(method, flowId, contentType, body) {
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
    var url = this.baseUrl + FLOWS_ENDPOINT + flowId;
    return fetch(url, options);
  }


  getFlow(flowId) {
    return this.doRequest('GET', flowId);
  }

  postFlow(flowId, actionId, body) {
    var customContentType = 'application/vnd.pingidentity.' + actionId + '+json';
    return this.doRequest('POST', flowId, customContentType, body);
  }

}
