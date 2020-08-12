import FetchUtil from './utils/fetchUtil';
import Assets from './utils/assets';
import queryString from 'query-string';
import 'core-js/stable';
import 'regenerator-runtime/runtime'; //for async await
import Store from './store';

import './scss/main.scss';
//uncomment to add your personal branding
// import './scss/branding.scss';

(function () {

  if (typeof window.CustomEvent === "function") return false;

  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  window.CustomEvent = CustomEvent;
})();

export default class AuthnWidget {
  static get FORM_ID() {
    return "AuthnWidgetForm";  //name of the form ID used in all handlebar templates
  }

  static get CORE_STATES() {
    return ['USERNAME_PASSWORD_REQUIRED', 'MUST_CHANGE_PASSWORD', 'NEW_PASSWORD_RECOMMENDED',
      'NEW_PASSWORD_REQUIRED', 'SUCCESSFUL_PASSWORD_CHANGE', 'ACCOUNT_RECOVERY_USERNAME_REQUIRED',
      'ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED', 'RECOVERY_CODE_REQUIRED', 'PASSWORD_RESET_REQUIRED',
      'SUCCESSFUL_PASSWORD_RESET', 'CHALLENGE_RESPONSE_REQUIRED', 'USERNAME_RECOVERY_EMAIL_REQUIRED',
      'USERNAME_RECOVERY_EMAIL_SENT', 'SUCCESSFUL_ACCOUNT_UNLOCK', 'IDENTIFIER_REQUIRED',
      'EXTERNAL_AUTHENTICATION_COMPLETED', 'EXTERNAL_AUTHENTICATION_FAILED', 'EXTERNAL_AUTHENTICATION_REQUIRED'];
  }

  static get COMMUNICATION_ERROR_MSG() {
    return "Unable to start the authentication flow, please contact your system administrator.";
  }

  static get FLOW_ID_REQUIRED_MSG() {
    return "'flowId' query parameter is required.";
  }

  static get BASE_URL_REQUIRED_MSG() {
    return "PingFederate Base URL is required."
  }
  /*
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} divId Required: the div Id where the widget will display the UI html associated per state
   * @param {object} options object containing additional options such as flowId and divId
   */
  constructor(baseUrl, options) {
    this.flowId = (options && options.flowId) || this.getBrowserFlowId();
    this.divId = (options && options.divId) || 'authnwidget';
    if (!baseUrl) {
      throw new Error(AuthnWidget.BASE_URL_REQUIRED_MSG);
    }
    this.captchaDivId = 'invisibleRecaptchaId';
    this.assets = new Assets(options);
    this.baseUrl = baseUrl;
    this.fetchUtil = new FetchUtil(baseUrl);
    this.invokeReCaptcha = options && options.invokeReCaptcha;
    this.checkRecaptcha = options && options.checkRecaptcha;
    this.grecaptcha = options && options.grecaptcha;
    this.dispatch = this.dispatch.bind(this);
    this.render = this.render.bind(this);
    this.defaultEventHandler = this.defaultEventHandler.bind(this);
    this.handleIdFirstLinks = this.handleIdFirstLinks.bind(this);
    this.registerIdFirstLinks = this.registerIdFirstLinks.bind(this);
    this.postExternalAuthenticationCompleted = this.postExternalAuthenticationCompleted.bind(this);
    this.registerReopenPopUpHandler = this.registerReopenPopUpHandler.bind(this);
    this.handleReopenPopUp = this.handleReopenPopUp.bind(this);
    this.stateTemplates = new Map();  //state -> handlebar templates
    this.eventHandler = new Map();  //state -> eventHandlers
    this.postRenderCallbacks = new Map();
    this.actionModels = new Map();
    this.store = new Store(this.flowId, this.fetchUtil, this.checkRecaptcha);
    this.store.registerListener(this.render);
    AuthnWidget.CORE_STATES.forEach(state => this.registerState(state));

    this.addEventHandler('IDENTIFIER_REQUIRED', this.registerIdFirstLinks);
    this.addEventHandler('EXTERNAL_AUTHENTICATION_COMPLETED', this.postExternalAuthenticationCompleted);
    this.addEventHandler('EXTERNAL_AUTHENTICATION_REQUIRED', this.registerReopenPopUpHandler)

    this.actionModels.set('checkUsernamePassword', { required: ['username', 'password'], properties: ['username', 'password', 'rememberMyUsername', 'thisIsMyDevice', 'captchaResponse'] });
    this.actionModels.set('initiateAccountRecovery', { properties: ['usernameHint'] });
    this.actionModels.set('useAlternativeAuthenticationSource', { required: ['authenticationSource'], properties: ['authenticationSource'] });
    this.actionModels.set('checkUsernameRecoveryEmail', { required: ['email'], properties: ['email', 'captchaResponse'] });
    this.actionModels.set('checkAccountRecoveryUsername', { required: ['username'], properties: ['username', 'captchaResponse'] });
    this.actionModels.set('checkNewPassword', { required: ['username', 'existingPassword', 'newPassword'], properties: ['username', 'existingPassword', 'newPassword', 'captchaResponse'] });
    this.actionModels.set('checkPasswordReset', { required: ['newPassword'], properties: ['newPassword'] });
    this.actionModels.set('checkRecoveryCode', { required: ['recoveryCode'], properties: ['recoveryCode'] });
    this.actionModels.set('checkChallengeResponse', { required: ['challengeResponse'], properties: ['challengeResponse'] });
    this.actionModels.set('submitIdentifier', { required: ['identifier'], properties: ['identifier'] });
    this.actionModels.set('clearIdentifier', { required: ['identifier'], properties: ['identifier'] });
  }

  init() {
    try {
      if (!this.flowId) {
        throw new Error(AuthnWidget.FLOW_ID_REQUIRED_MSG);
      }
      this.renderSpinnerTemplate();
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    } catch (err) {
      console.error(err);
      this.generalErrorRenderer(err.message);
    }
  }

  renderSpinnerTemplate() {
    let template = this.getTemplate('initial_spinner');
    let params = this.assets.toTemplateParams();
    let widgetDiv = document.getElementById(this.divId);
    widgetDiv.innerHTML = template(params);
  }

  generalErrorRenderer(msg) {
    let template = this.getTemplate('general_error');
    let params = this.assets.toTemplateParams();
    if (msg) {
      params.msg = msg;
    }
    let widgetDiv = document.getElementById(this.divId);
    widgetDiv.innerHTML = template(params);
  }

  defaultEventHandler() {
    Array.from(document.querySelector(`#${this.divId}`)
      .querySelectorAll("[data-actionId]"))
      .forEach(element => element.addEventListener("click", this.dispatch));

    let nodes = document.querySelectorAll(`#${this.divId} input[type=text], input[type=password], input[type=email]`);
    if (nodes) {
      nodes.forEach(n => n.addEventListener('input', this.enableSubmit));
    }
    let element = nodes[0];
    if (element) {
      let event = new CustomEvent('input');
      element.dispatchEvent(event);
    }

    if (this.getForm()) {
      this.getForm().addEventListener("keydown", evt => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          let elem = document.querySelector("#submit");
          elem && elem.click();
        }
      });
    }
  }

  registerIdFirstLinks() {
    Array.from(document.querySelectorAll('[data-idfirstaction]')).
      forEach(element => element.addEventListener('click', this.handleIdFirstLinks));
  }

  handleIdFirstLinks(evt) {
    evt.preventDefault();
    let source = evt.target || evt.srcElement;
    let actionId = source.dataset['idfirstaction'];
    let identifier = source.dataset['identifier'];
    let data = {
      identifier
    }
    console.log(actionId + ' : ' + identifier);
    switch (actionId) {
      case 'submitIdentifier':
      case 'clearIdentifier':
        this.store.dispatch('POST_FLOW', actionId, JSON.stringify(data));
        break;
      case 'selectidentifier':
        document.getElementById('existingAccountsSelectionList').style.display = 'none';
        document.getElementById('signonidentifier').style.display = 'block';
        break;
    }
  }

  postExternalAuthenticationCompleted() {
    setTimeout(() => {
        this.store.dispatch('POST_FLOW', 'continueAuthentication', '{}');
      }, 1000)
  }

  registerReopenPopUpHandler() {
    Array.from(document.querySelectorAll('[data-externalAuthActionId]'))
      .forEach(element => element.addEventListener('click', this.handleReopenPopUp));
  }

  handleReopenPopUp(evt) {
    evt.preventDefault();
    console.log(this)
    let windowReference = window.open(this.store.getStore().authenticationUrl, "_blank", "width=500px,height=500px");
    if (document.querySelector("#spinnerId")) {
      document.querySelector('#spinnerId').style.display = 'block';
    }
    if (document.querySelector("#externalAuthnId")) {
      document.querySelector('#externalAuthnId').style.display = 'none';
    }
    clearTimeout(this.checkPopupStatusTimeout)
    this.checkPopupStatus(windowReference);
  }

  verifyPasswordsMatch() {
    let pass1 = document.querySelector('#newpassword');
    let pass2 = document.querySelector('#verifypassword');
    if (pass1.value !== pass2.value) {
      this.store.dispatchErrors('New passwords do not match.');
      return false;
    }
    else {
      this.store.clearErrors();
    }
    return true;
  }

  enableSubmit() {
    let nodes = (document.querySelectorAll('input[type=text], input[type=password], input[type=email]'));
    let disabled = false;
    if (nodes) {
      nodes.forEach(input => {
        //validate empty + other things
        if (input.value === '' || !input.value.replace(/\s/g, '').length) {
          disabled = true
        }
        if (input.type === 'email') {
          let isValidEmail = input.checkValidity();
          if (!isValidEmail) {
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
   * @param action
   * @param data
   * @returns {string|*} the model to be sent to PingFederate after all required fields are available
   */
  validateActionModel(action, data) {
    const model = this.actionModels.get(action);
    if (model === undefined) {
      return undefined;
    }
    if (model.properties) {
      //remove unneeded params
      Object.keys(data).forEach(key => !model.properties.includes(key) ? delete data[key] : '');
    }
    return data;
  }

  getForm() {
    return document.getElementById(AuthnWidget.FORM_ID);
  }

  getPasswordResetActions() {
    return ['checkNewPassword', 'checkPasswordReset'];
  }

  dispatch(evt) {
    evt.preventDefault();
    let source = evt.target || evt.srcElement;
    console.log('source: ' + source.dataset['actionid']);
    let actionId = source.dataset['actionid'];
    let formData = this.getFormData();
    formData = this.validateActionModel(actionId, formData);
    if (this.getPasswordResetActions().includes(actionId) &&
      !this.verifyPasswordsMatch()) {
      return;
    }

    if (this.store.state.showCaptcha && this.needsCaptchaResponse(actionId) &&
      this.store.state.captchaSiteKey && this.invokeReCaptcha) {
      this.store.savePendingState('POST_FLOW', actionId, formData);
      this.invokeReCaptcha();
      return;
    } else {
      this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
    }
  }

  needsCaptchaResponse(actionId) {
    return this.actionModels.get(actionId)
      && this.actionModels.get(actionId).properties
      && this.actionModels.get(actionId).properties.some(prop => prop === 'captchaResponse');
  }

  dispatchPendingState(token) {
    this.store.dispatchPendingState(token);
  }

  clearPendingState() {
    this.store.clearPendingState();
  }

  getFormData() {
    let formElement = this.getForm();
    if (formElement) {
      let formData = new FormData(formElement);
      let object = {};
      var formDataEntries = formData.entries(), formDataEntry = formDataEntries.next(), pair;
      while (!formDataEntry.done) {
        pair = formDataEntry.value;
        object[pair[0]] = pair[1];
        formDataEntry = formDataEntries.next();
      }
      return object;
    }
  }

  render(prevState, state) {

    let currentState = state.status;
    if (currentState === 'RESUME') {
      window.location.replace(state.resumeUrl);
      return;
    }
    if (currentState === 'EXTERNAL_AUTHENTICATION_REQUIRED') {
      if (state.presentationMode === 'POP_UP') {
        if (this.store.getStore().status !== this.store.getPreviousStore().status) {
          let windowReference = window.open(state.authenticationUrl, "_blank", "width=500px,height=500px");
          this.checkPopupStatus(windowReference);
        }
      } else {
        window.location.replace(state.authenticationUrl);
        return;
      }
    }
    if (currentState === 'EXTERNAL_AUTHENTICATION_FAILED') {
      if (state.errorUrl) {
        window.location.replace(state.errorUrl);
        return;
      }
    }
    let template;
    if (currentState) {
      try {
        template = this.getTemplate(currentState);
      }
      catch (e) {
        console.log(`Failed to load template: ${currentState}.`);
        template = this.getTemplate('general_error');
      }
    }
    let widgetDiv = document.getElementById(this.divId);
    var params = Object.assign(state, this.assets.toTemplateParams())
    widgetDiv.innerHTML = template(params);
    this.registerEventListeners(currentState);
    if(this.postRenderCallbacks[currentState]){
      this.postRenderCallbacks[currentState](state);
    }
    if (this.store.state.showCaptcha && this.grecaptcha) {
      this.grecaptcha.render(this.captchaDivId);
    }
  }

  getBrowserFlowId() {
    const searchParams = queryString.parse(location.search);
    return searchParams.flowId || '';
  }

  registerEventListeners(stateName) {
    console.log('registering events for: ' + stateName);
    if (stateName && this.eventHandler.get(stateName)) {
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
    if (template === undefined) {
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
    this.eventHandler.set(stateName, evtHandlers);
  }

  addPostRenderCallback(stateName, callback) {
    this.postRenderCallbacks[stateName] = callback;
  }

  registerActionModel(action, model) {
    this.actionModels.set(action, model);
  }

  checkPopupStatus(windowReference) {
    if (windowReference !== null) {
      if (windowReference.closed) {
        clearTimeout(this.checkPopupStatusTimeout)
        this.store
          .dispatch('GET_FLOW')
          .then(() => {
            if (document.querySelector("#spinnerId")) {
              document.querySelector('#spinnerId').style.display = 'none';
            }
            if (document.querySelector("#externalAuthnId")) {
              document.querySelector('#externalAuthnId').style.display = 'block';
            }
          });
      } else {
        this.checkPopupStatusTimeout = setTimeout(() => {
          this.checkPopupStatus(windowReference)
        }, 100);
      }
    } else {
      if (!(document.querySelector("#spinnerId") && document.querySelector("#externalAuthnId"))) {
        this.checkPopupStatusTimeout = setTimeout(() => {
          this.checkPopupStatus(windowReference)
        }, 100);
      } else {
        clearTimeout(this.checkPopupStatusTimeout)
        document.querySelector('#spinnerId').style.display = 'none';
        document.querySelector('#externalAuthnId').style.display = 'block';
      }
    }
  }
}