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
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }
    this.loadStandardTemplates();
    this.registerHelpers();
  }

  init = async() => {
    try {
      if(!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }

      let result = await this.fetchUtil.getFlow(this.flowId);
      if (result.ok) {
        try {
          let json = await result.json();
          console.log(json);
          if(json.status === 'RESUME') {
            window.location.replace(json.resumeUrl);

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
        console.log(result.statusText);
      }
    }
    catch(err) {
      throw err; //new AuthnApiError(err);
    }
  };

  registerHelpers = () => {
    Handlebars.registerHelper("checkedIf", function (condition) {
      return (condition) ? "checked" : "";
    });
  }

  dispatch = async(event) => {
    console.log(event);
    if(event) {
      event.preventDefault();
    }
    let formData = new FormData(document.getElementById('AuthnWidgetForm'));


    let result = await this.fetchUtil.postFlow(this.flowId, 'checkUsernamePassword', JSON.stringify(Object.fromEntries(formData)));
    if (result.ok) {
      try {
        let json = await result.json();
        console.log(json);
        if(json.status === 'RESUME') {
          window.location.replace(json.resumeUrl);

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
    }
    document.getElementById("authn-widget-submit").removeEventListener("click", this.dispatch);

    //post to PF with the data

  }

  registerState = (state, templateName) => {
    this.stateTemplatesMap.set(state, templateName);
  }

  renderState = data => {
    const template = this.stateTemplatesMap.get(data.status);
    document.getElementById(this.divId).innerHTML =  template(data);
    document.getElementById("authn-widget-submit").addEventListener("click", this.dispatch);
  }

  getBrowserFlowId = () => {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }
}



