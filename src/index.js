const AuthnApiError = require('./errors/AuthnApiError');
const fetchUtil = require('./utils/fetchUtil');
const queryString = require('query-string');
require('regenerator-runtime/runtime'); //for async await
const Handlebars = require('handlebars/runtime');

class AuthnWidget {

  /**
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} flowId initial flow ID
   */
  constructor(baseUrl, divId, flowId) {
    this.baseUrl = baseUrl;
    this.divId = divId;
    this.stateTemplatesMap = new Map();
    this.flowId = flowId || this.getBrowserFlowId();
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }

    Handlebars.registerHelper("checkedIf", function (condition) {
      return (condition) ? "checked" : "";
    });
  }

  async init() {
    try {
      if(!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }
      let result = await fetchUtil.getFlow(this.baseUrl, this.flowId);
      if (result.ok) {
        try {
          let json = await result.json();
          console.log(json);
          const template = require('./partials/username_password_required.handlebars');
          document.getElementById(this.divId).innerHTML =  template(json);
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

  registerState(state, templateName) {
    this.stateTemplatesMap.set(state, templateName);
  }

  renderState(state) {
    const templateName = this.stateTemplatesMap.get(state);
  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}

module.exports = AuthnWidget;



