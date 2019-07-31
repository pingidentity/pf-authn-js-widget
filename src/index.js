const AuthnApiError = require('./errors/AuthnApiError');
const fetchUtil = require('./utils/fetchUtil');
const queryString = require('query-string');


class AuthnWidget {

  /**
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} flowId initial flow ID
   */
  constructor(baseUrl, divId, flowId) {
    this.baseUrl = baseUrl;
    this.divId = divId;
    this.flowId = flowId || this.getBrowserFlowId();
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }
  }

  async init() {
    try {
      if(!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }
      let result = await fetchUtil.getFlow(this.baseUrl, this.flowId);
      console.log(result);
      if (result.ok) {
        try {
          let json = await result.json();
          console.log(json);
        }
        catch (e) {
          throw e;//new AuthnApiError(e);
        }
      }
      else {
        console.log(result.statusText);
      }
    }
    catch(err) {
      throw err; //new AuthnApiError(err);
    }
  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}

module.exports = AuthnWidget;



