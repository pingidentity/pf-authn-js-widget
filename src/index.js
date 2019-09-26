import FetchUtil from './utils/fetchUtil';
import Assets from './utils/assets';
import queryString from 'query-string';
import 'core-js/stable';
import 'regenerator-runtime/runtime'; //for async await
import Store from './store';

export default class AuthnWidget {

  static get FORM_ID(){
    return "AuthnWidgetForm";  //name of the form ID used in all handlebar templates
  }

  static get CORE_STATES() {
    return ['USERNAME_PASSWORD_REQUIRED', 'MUST_CHANGE_PASSWORD', 'NEW_PASSWORD_RECOMMENDED',  'NEW_PASSWORD_REQUIRED', 'SUCCESSFUL_PASSWORD_CHANGE',
      'ACCOUNT_RECOVERY_USERNAME_REQUIRED','ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED','RECOVERY_CODE_REQUIRED', 'PASSWORD_RESET_REQUIRED',
      'SUCCESSFUL_PASSWORD_RESET',  'USERNAME_RECOVERY_EMAIL_REQUIRED', 'USERNAME_RECOVERY_EMAIL_SENT', 'SUCCESSFUL_ACCOUNT_UNLOCK',
      'IDENTIFIER_REQUIRED'
    ];
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
    this.captchaDivId = 'invisibleRecaptchaId';
    this.assets = new Assets(options);
    this.fetchUtil = new FetchUtil(baseUrl);
    this.invokeReCaptcha = options.invokeReCaptcha;
    this.checkRecaptcha = options.checkRecaptcha;
    this.grecaptcha = options.grecaptcha;
    this.dispatch = this.dispatch.bind(this);
    this.render = this.render.bind(this);
    this.defaultEventHandler = this.defaultEventHandler.bind(this);
    this.stateTemplates = new Map();  //state -> handlebar templates
    this.eventHandler = new Map();  //state -> eventHandlers
    this.actionModels = new Map();
    this.store = new Store(this.flowId, this.fetchUtil, this.checkRecaptcha);
    this.store.registerListener(this.render);
    AuthnWidget.CORE_STATES.forEach(state => this.registerState(state));

    this.actionModels.set('checkUsernamePassword', {required: ['username', 'password'], properties: ['username', 'password', 'rememberMyUsername', 'thisIsMyDevice', 'captchaResponse']});
    this.actionModels.set('initiateAccountRecovery', {properties: ['usernameHint']});
    this.actionModels.set('useAlternativeAuthenticationSource', {required: ['authenticationSource'], properties: ['authenticationSource']});
    this.actionModels.set('checkUsernameRecoveryEmail', {required: ['email'], properties: ['email', 'captchaResponse']});
    this.actionModels.set('checkAccountRecoveryUsername', {required: ['username'], properties: ['username', 'captchaResponse']});
    this.actionModels.set('checkNewPassword', {required: ['username', 'existingPassword', 'newPassword'], properties:  ['username', 'existingPassword', 'newPassword', 'captchaResponse']});
    this.actionModels.set('checkPasswordReset', {required: ['newPassword'], properties: ['newPassword']});
    this.actionModels.set('checkRecoveryCode', {required: ['recoveryCode'], properties: ['recoveryCode']});
    this.actionModels.set('checkChallengeResponse', {required: ['challengeResponse'], properties: ['challengeResponse']});
    this.actionModels.set('submitIdentifier', {required: ['identifier'], properties: ['identifier']});
    this.actionModels.set('clearIdentifier', {required: ['identifier'], properties: ['identifier']});
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

  defaultEventHandler() {
    Array.from(document.querySelector(`#${this.divId}`)
                       .querySelectorAll("[data-actionId]")).forEach(element => element.addEventListener("click", this.dispatch));

    let nodes = document.querySelectorAll(`#${this.divId} input[type=text], input[type=password], input[type=email]`);
    if(nodes) {
      nodes.forEach(n => n.addEventListener('input', this.enableSubmit));
    }
    let element = nodes[0];
    if(element) {
      let event = new Event('input');
      element.dispatchEvent(event);
    }

    if(this.getForm()) {
      this.getForm().addEventListener("keydown", evt => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          let elem = document.querySelector("#submit");
          elem && elem.click();
        }
      });
    }
  }

  enableSubmit(evt) {
    let nodes = document.querySelectorAll('input[type=text], input[type=password], input[type=email]');
    let disabled = false;
    if(nodes) {
      nodes.forEach(input => {
        //validate empty + other things
        if (input.value === '' || !input.value.replace(/\s/g, '').length) {
          disabled = true
        }
        if(input.type === 'email') {
          let isValidEmail = input.checkValidity();
          if(!isValidEmail) {
            disabled = true;
          }
        }
      });
    }

    document.querySelector('#submit').disabled = disabled;
  }

  /**
   * validate against the action model.
   * if the model has no data, return empty post body
   * if it's missing required attributes, fill the err message
   * (error handling can also be done by PF but this is a way to do front end validation. e.g. missing password)
   * @param action
   * @param data
   * @param err
   * @returns {string|*} the model to be sent to PingFederate after all required fields are available
   */
  validateActionModel(action, data) {
    const model = this.actionModels.get(action);
    if(model === undefined) {
      return undefined;
    }
    if(model.properties) {
      //remove unneeded params
      Object.keys(data).forEach(key => !model.properties.includes(key) ? delete data[key] : '');
    }
    return data;
  }

  getForm() {
    return document.querySelector(`#${this.divId}`).querySelector(`#${AuthnWidget.FORM_ID}`);
  }

  dispatch(evt){
    evt.preventDefault();
    let source = evt.target || evt.srcElement;
    console.log('source: ' + source.dataset['actionid']);
    let actionId = source.dataset['actionid'];
    //TODO run mapping of data to model and throw validation
    let formData = this.getFormData();
    formData = this.validateActionModel(actionId, formData);

    if(this.store.state.showCaptcha && this.needsCaptchaResponse(actionId) && this.store.state.captchaSiteKey) {
      this.store.savePendingState('POST_FLOW', actionId, formData);
      this.invokeReCaptcha();
      return;
    }
    else {
      this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
    }
  }

  needsCaptchaResponse(actionId) {
    return this.actionModels.get(actionId) && this.actionModels.get(actionId).properties && this.actionModels.get(actionId).properties.some(prop => prop === 'captchaResponse');
  }

  dispatchPendingState(token) {
    this.store.dispatchPendingState(token);
  }

  clearPendingState() {
    this.store.clearPendingState();
  }

  getFormData(){
    let formElement = this.getForm();
    if(formElement) {
      let formData = new FormData(formElement);
      return Object.fromEntries(formData);
    }
  }

  render(prevState, state) {

    let currentState = state.status;
    if (currentState === 'RESUME') {
      window.location.replace(state.resumeUrl);
    }

    let template;
    if(currentState) {
      template = this.getTemplate(currentState);
    }
    if (!template) {
      console.log(`Failed to load template: ${currentState}.`);
      template = this.getTemplate('general_error');
    }
    let widgetDiv = document.getElementById(this.divId);
    var params = Object.assign(state, this.assets.toTemplateParams())
    widgetDiv.innerHTML = template(params);
    this.registerEventListeners(currentState);
    if(this.store.state.showCaptcha) {
      this.grecaptcha.render(this.captchaDivId);
    }
  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }

  registerEventListeners(stateName) {
    console.log('registering events for: ' + stateName);
    if(stateName && this.eventHandler.get(stateName)) {
        this.eventHandler.get(stateName).forEach(fn => fn());
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
      template = require(`./partials/${key}.hbs`);
      this.stateTemplates.set(key, template);
    }
    return template;
  }

  registerState(stateName, eventHandlerFn = [this.defaultEventHandler]) {
    this.eventHandler.set(stateName, eventHandlerFn);
  }

  addEventHandler(stateName, eventHandler) {
    let evtHandlers = this.eventHandler.get(stateName);
    evtHandlers.push(eventHandler);
  }

  registerActionModel(action, model) {
    this.actionModels.set(action, model);
  }
}
