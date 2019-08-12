import FetchUtil from './utils/fetchUtil';
import queryString from 'query-string';
import 'regenerator-runtime/runtime'; //for async await
import Handlebars from 'handlebars/runtime';
import Store from './store';
import * as templates from "./stateTemplates";


export default class AuthnWidget {

  /**
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} divId Required: the div Id where the widget will display the UI html associated per state
   * @param {string} flowId initial flow ID
   */
  constructor(baseUrl, divId, flowId) {
    this.flowId = flowId || this.getBrowserFlowId();
    this.divId = divId;
    this.fetchUtil = new FetchUtil(baseUrl);
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }
    this.registerHelpers(); //TODO do it as part of webpack helper
    this.store = new Store(this.flowId, this.fetchUtil);
    this.store.registerListener(this.render);
    this.eventHandler = this.makeEventHandlers();

  }

  init() {
    try {
      if (!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }
      this.store.dispatch('GET_FLOW');
    } catch (err) {
      throw err; //new AuthnApiError(err);
    }
  }

  dispatch = evt => {
    if(evt) {
      evt.preventDefault();
    }
    let source = evt.target || evt.srcElement
    console.log('source: ' + source.dataset['actionid']);
    let actionId = source.dataset['actionid'];
    this.store.dispatch('POST_FLOW', actionId, this.getFormData());
  }

  getFormData(){
    let formElement = document.getElementById('AuthnWidgetForm');
    if(formElement) {
      let formData = new FormData(formElement);
      return JSON.stringify(Object.fromEntries(formData));
    }
  }

  registerHelpers() {
    Handlebars.registerHelper("checkedIf", function (condition) {
      return (condition) ? "checked" : "";
    });
  }

  render = (prevState, state) => {
    console.log('called render');
    let combinedData = state;
    let currentState = state.status;
    if (currentState === 'RESUME') {
      window.location.replace(state.resumeUrl);
    }
    let template = templates.getTemplate(currentState);
    //TODO show error page if no template found
    let widgetDiv = document.getElementById(this.divId);
    widgetDiv.innerHTML = template(combinedData);
    this.registerEventListeners(widgetDiv, currentState);

  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }

  registerEventListeners(div, stateName) {
    console.log('registering events for: ' + stateName);
    if(stateName) {
      console.log('found fn for events: ' + this.eventHandler[stateName]);
      this.eventHandler[stateName]();
    }
  }

  renderPage(result, json) {
    if (result.ok) {
      try {
        console.log(json);
        if(json.status === 'RESUME') {
          window.location.replace(json.resumeUrl);
        }
        else {
          // this.renderState(this._getErrorDetails(json));
          this.renderState(json);
        }

      }
      catch (e) {
        throw e;//new AuthnApiError(e);
      }
    }
    else {
      console.log(result.statusText); //TODO parse validation error and display
      if(json.code === 'VALIDATION_ERROR') {
        this.renderState(json);
      }
      else {  //TODO render general error page code it against the errors in com.pingidentity.sdk.api.authn.common.CommonErrorSpec
        console.log(json.message);
        this.renderError(json); //{"code":"RESOURCE_NOT_FOUND","message":"The requested resource was not found."}

      }
    }
  }

  makeEventHandlers() {
    return {
      'USERNAME_PASSWORD_REQUIRED': () => {
        console.log('invoking fn');
        document.getElementById("authn-widget-submit").addEventListener("click", this.dispatch);
      },
      'MUST_CHANGE_PASSWORD': () => {

      },
      'NEW_PASSWORD_RECOMMENDED': () => {

      },
      'NEW_PASSWORD_REQUIRED': () => {

      },
      'SUCCESSFUL_PASSWORD_CHANGE': () => {

      },
      'ACCOUNT_RECOVERY_USERNAME_REQUIRED': () => {

      },
      'ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED': () => {

      },
      'RECOVERY_CODE_REQUIRED': () => {

      },
      'PASSWORD_RESET_REQUIRED': () => {

      },
      'SUCCESSFUL_PASSWORD_RESET': () => {

      },
      'USERNAME_RECOVERY_EMAIL_REQUIRED': () => {

      },
      'USERNAME_RECOVERY_EMAIL_SENT': () => {

      },
      'SUCCESSFUL_ACCOUNT_UNLOCK': () => {

      },
      'IDENTIFIER_REQUIRED': () => {

      }

    }
  }


}



