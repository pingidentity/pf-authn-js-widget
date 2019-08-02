import AuthnApiError from './errors/AuthnApiError';
import FetchUtil from './utils/fetchUtil';
import queryString from 'query-string';
import 'regenerator-runtime/runtime'; //for async await
import Handlebars from 'handlebars/runtime';


export default class AuthnWidget {

  loadStandardTemplates() {
    this.stateTemplatesMap.set('USERNAME_PASSWORD_REQUIRED', require('./partials/username_password_required.handlebars'));
  }

  /**
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} flowId initial flow ID
   */
  constructor(baseUrl, divId, flowId) {
    this.divId = divId;
    this.stateTemplatesMap = new Map();
    this.flowId = flowId || this.getBrowserFlowId();
    this.fetchUtil = new FetchUtil(baseUrl);
    this.currentState = undefined;
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }
    this.loadStandardTemplates();
    this.registerHelpers();
  }

  init = async () => {
    try {
      if (!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }

      let result = await this.fetchUtil.getFlow(this.flowId);
      let json = await result.json();
      if (result.ok) {
        try {
          console.log(json);
          if (json.status === 'RESUME') {
            window.location.replace(json.resumeUrl);

          } else if (json.status === 'FAILED') {
            this.renderState(this._getErrorDetails(json));
          } else if (json.status !== undefined) {
            this.renderState(json);
          }
        } catch (e) {
          throw e;//new AuthnApiError(e);
        }
      } else {
        console.log(result.statusText);
        this.renderState(this._getErrorDetails(json));
      }
    } catch (err) {
      throw err; //new AuthnApiError(err);
    }
  };

  registerHelpers = () => {
    Handlebars.registerHelper("checkedIf", function (condition) {
      return (condition) ? "checked" : "";
    });
  }

  _getFormData = () => new FormData(document.getElementById('AuthnWidgetForm'));

  _getErrorDetails = result => {
      //TODO handle 404
      return {
        error: result.userMessage,
        errorDetails: result.details && result.details[0] ? result.details[0].userMessage : ''  //TODO show better errors
      }
  }

  dispatch = async(event) => {
    console.log(event);
    if(event) {
      event.preventDefault();
    }
    let formData = this._getFormData();


    let result = await this.fetchUtil.postFlow(this.flowId, 'checkUsernamePassword', JSON.stringify(Object.fromEntries(formData)));
    let json = await result.json();
    if (result.ok) {
      try {
        console.log(json);
        if(json.status === 'RESUME') {
          window.location.replace(json.resumeUrl);
          document.getElementById("authn-widget-submit").removeEventListener("click", this.dispatch);
        }
        else if(json.status === 'FAILED') {
          this.renderState(this._getErrorDetails(json));
        }
        else if(json.status !== undefined) {
          this.renderState(json);
        }
      }
      catch (e) {
        throw e;//new AuthnApiError(e);
      }
    }
    else {
      console.log(result.statusText); //TODO parse validation error and display
      this.renderState(this._getErrorDetails(json));
    }

    //post to PF with the data

  }



  registerState = (state, templateName) => {
    this.stateTemplatesMap.set(state, templateName);
    //TODO
  }

  renderState = data => {
    let template = this.currentState;
    if(data.status) {
      template = this.stateTemplatesMap.get(data.status); //TODO what if no state in data
      this.currentState = template;
    }
    if(template) {
      document.getElementById(this.divId).innerHTML = template(data);
      document.getElementById("authn-widget-submit").addEventListener("click", this.dispatch);
    }

  }

  getBrowserFlowId = () => {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}



