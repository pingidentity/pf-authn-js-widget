const AuthnApiError = require('./errors/AuthnApiError');
const fetchUtil = require('./utils/fetchUtil');
const queryString = require('query-string');
require('regenerator-runtime/runtime'); //for async await
const Handlebars = require('handlebars/runtime');


class AuthnWidget {

  loadStandardTemplates() {
    this.stateTemplatesMap.set('USERNAME_PASSWORD_REQUIRED', require('./partials/username_password_required.handlebars'));
  }

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
    this.loadStandardTemplates();
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
          this.renderState('USERNAME_PASSWORD_REQUIRED', json);
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


  dispatch(event) {
    console.log(event);
    event.preventDefault();
    document.getElementById("authn-widget-submit").removeEventListener("click", this.dispatch);
  }

  registerState(state, templateName) {
    this.stateTemplatesMap.set(state, templateName);
  }

  renderState(state, data) {
    const template = this.stateTemplatesMap.get(state);
    document.getElementById(this.divId).innerHTML =  template(data);
    document.getElementById("authn-widget-submit").addEventListener("click", this.dispatch);
  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}

module.exports = AuthnWidget;



