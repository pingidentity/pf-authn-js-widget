import FetchUtil from './utils/fetchUtil';
import queryString from 'query-string';
import 'regenerator-runtime/runtime'; //for async await
import Handlebars from 'handlebars/runtime';
import Store from './store';
import { getCoreStates } from './coreStates';
import { getCustomStates } from './customStates';


export default class AuthnWidget {

  static get FORM_ID(){
    return "AuthnWidgetForm";  //name of the form ID used in all handlebar templates
  }
  /*
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} divId Required: the div Id where the widget will display the UI html associated per state
   * @param {object} options object containing additional options such as flowId and divId
   */
  constructor(baseUrl, options) {
    this.flowId = options.flowId || this.getBrowserFlowId();
    this.divId = options.divId || 'authnwidget';
    if (!baseUrl) {
      throw new Error('Must provide base Url for PingFederate in the constructor');
    }
    this.fetchUtil = new FetchUtil(baseUrl);
    this.dispatch = this.dispatch.bind(this);
    this.render = this.render.bind(this);
    this.stateTemplates = new Map();
    this.registerHelpers(); //TODO do it as part of webpack helper

    this.store = new Store(this.flowId, this.fetchUtil);
    this.store.registerListener(this.render);
    this.eventHandler = {...getCoreStates(this.dispatch), ...getCustomStates(this.dispatch)};

  }

  init() {
    try {
      if (!this.flowId) {
        throw new Error('Must provide flowId as a query string parameter');
      }
      this.store.dispatch('GET_FLOW');
    } catch (err) {
      throw err;
    }
  }

  dispatch(evt){
    evt.preventDefault();
    let source = evt.target || evt.srcElement
    console.log('source: ' + source.dataset['actionid']);
    let actionId = source.dataset['actionid'];
    this.eventHandler[this.store.state.status](this.store);
    //TODO run mapping of data to model and throw validation
    this.store.dispatch('POST_FLOW', actionId, this.getFormData());
  }

  getFormData(){
    let formElement = document.getElementById(AuthnWidget.FORM_ID);
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

  render(prevState, state) {
    let combinedData = state;
    let currentState = state.status;
    if (currentState === 'RESUME') {
      window.location.replace(state.resumeUrl);
    }

    let template = this.getTemplate(currentState);
    if(!template) {
      //TODO show error page if no template found
      console.log(`Failed to load template: ${currentState}.`);
      template = this.getTemplate('general_error');
    }
    let widgetDiv = document.getElementById(this.divId);
    widgetDiv.innerHTML = template(combinedData);
    this.registerEventListeners(widgetDiv, currentState);

  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }

  registerEventListeners(div, stateName) {
    Array.from(div.querySelectorAll("[data-actionId]")).forEach(element => element.addEventListener("click", this.dispatch));
    console.log('registering events for: ' + stateName);
    if(stateName) {
      this.eventHandler[stateName]();
    }
  }

  /**
   * get the corresponding template for the state.
   * By convention, the template should be the same name as the state but in lower case with a handlebars extension
   * @param key name of the state in lower case
   * @returns {template} template content
   */
  getTemplate(key) {
    key = key.toLowerCase();
    let template = this.stateTemplates.get(key);
    if(template === undefined) {
      template = require(`./partials/${key}.handlebars`);
      this.stateTemplates.set(key, template);
    }
    return template;
  }



}



