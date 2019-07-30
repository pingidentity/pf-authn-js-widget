const fetchUtil = require('./utils/fetchUtil');
const queryString = require('query-string');

class AuthnWidget {

  /**
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} flowId initial flow ID
   */
  constructor(baseUrl, flowId) {
    this.baseUrl = baseUrl;
    this.flowId = flowId || this.getBrowserFlowId();
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }
  }

  init() {
    fetchUtil.getFlow(this.baseUrl, this.flowId);
  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}

module.exports = AuthnWidget;



