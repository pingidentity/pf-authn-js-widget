export default class FetchUtil {
  baseUrl: string;
  useActionParam: boolean;
  cookieless: boolean;

  constructor(baseUrl: string, useActionParam = false) {
    this.baseUrl = baseUrl;
    this.useActionParam = useActionParam;
    this.cookieless = false;
  }

  configCookieless(flag: boolean): void {
    this.cookieless = flag;
  }

  doRequest(
    method: string,
    flowId: string,
    actionId: string | null,
    body: string | null,
    httpHeaders: Map<string, string>
  ): Promise<Response> {
    const FLOWS_ENDPOINT = '/pf-ws/authn/flows/';
    let url = this.baseUrl + FLOWS_ENDPOINT + flowId;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-XSRF-Header': 'PingFederate',
    };

    if (actionId) {
      let contentType = 'application/json';
      if (this.useActionParam) {
        url = url + '?action=' + actionId;
      } else {
        contentType = 'application/vnd.pingidentity.' + actionId + '+json';
      }
      headers['Content-Type'] = contentType;
    }

    httpHeaders.forEach((value, key) => {
      headers[key] = value;
    });

    const options: RequestInit = {
      headers,
      method,
      body,
    };

    if (!this.cookieless) {
      options.credentials = 'include';
    }

    return fetch(url, options);
  }

  getFlow(flowId: string, headers = new Map<string, string>()): Promise<Response> {
    return this.doRequest('GET', flowId, null, null, headers);
  }

  postFlow(
    flowId: string,
    actionId: string,
    body: string,
    headers = new Map<string, string>()
  ): Promise<Response> {
    return this.doRequest('POST', flowId, actionId, body, headers);
  }
}
