export default class fetchUtil {
  constructor(baseUrl, useActionParam = false) {
    this.baseUrl = baseUrl;
    this.useActionParam = useActionParam;
    this.cookieless = false;
  }

  configCookieless(flag) {
    this.cookieless = flag;
  }

  doRequest(method, flowId, actionId, body, httpHeaders) {
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
      } else {
        contentType = 'application/vnd.pingidentity.' + actionId + '+json';
      }
      headers['Content-Type'] = contentType;
    }
    // add more headers
    httpHeaders.forEach((value, key) => {
      headers[key] = value;
    });
    //options
    var options = {
      headers: headers,
      method: method,
      body: body,
    }
    // include credentials
    if (!this.cookieless) {
      options.credentials = 'include'
    }
    return fetch(url, options);
  }

  getFlow(flowId, headers = new Map()) {
    return this.doRequest('GET', flowId, headers);
  }

  postFlow(flowId, actionId, body, headers = new Map()) {
    return this.doRequest('POST', flowId, actionId, body, headers);
  }
}
