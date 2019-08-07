import AuthnApiError from './errors/AuthnApiError';
import FetchUtil from './utils/fetchUtil';
import queryString from 'query-string';
import 'regenerator-runtime/runtime'; //for async await
import Handlebars from 'handlebars/runtime';
import * as States from "./stateTemplates";


export default class AuthnWidget {

  loadStandardTemplates() {
    this.stateTemplatesMap.set(States.USERNAME_PASSWORD_REQUIRED, require(States.stateTemplates.get(States.USERNAME_PASSWORD_REQUIRED)));
  }

  /**
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} divId Required: the div Id where the widget will display the UI html associated per state
   * @param {string} flowId initial flow ID
   */
  constructor(baseUrl, divId, flowId) {
    this.stateTemplatesMap = new Map();
    this.flowId = flowId || this.getBrowserFlowId();
    this.fetchUtil = new FetchUtil(baseUrl);
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }

    this.state = new State(divId, this.flowId, this.fetchUtil);
    this.loadStandardTemplates();
    this.registerHelpers();
  }

  async init() {
    try {
      if (!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }

      let result = await this.fetchUtil.getFlow(this.flowId);
      let json = await result.json();
      this.state.renderPage(result, json);
    } catch (err) {
      throw err; //new AuthnApiError(err);
    }
  }

  registerHelpers() {
    Handlebars.registerHelper("checkedIf", function (condition) {
      return (condition) ? "checked" : "";
    });
  }


  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}



