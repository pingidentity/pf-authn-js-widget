import Assets from './utils/assets';
import queryString from 'query-string';
import 'core-js/stable';
import 'regenerator-runtime/runtime'; //for async await
import Store from './store';
import redirectlessConfigValidator from './validators/redirectless';
import { getCompatibility, doWebAuthn } from './utils/fidoFlowUtil';
import { completeStateCallback } from './utils/redirectless';
import paOnAuthorizationRequest from './utils/paOnAuthorizationRequest';
import paOnAuthorizationSuccess from './utils/paOnAuthorizationSuccess';
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
    return ['USERNAME_PASSWORD_REQUIRED', 'MUST_CHANGE_PASSWORD', 'CHANGE_PASSWORD_EXTERNAL', 'NEW_PASSWORD_RECOMMENDED',
      'NEW_PASSWORD_REQUIRED', 'SUCCESSFUL_PASSWORD_CHANGE', 'ACCOUNT_RECOVERY_USERNAME_REQUIRED',
      'ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED', 'RECOVERY_CODE_REQUIRED', 'PASSWORD_RESET_REQUIRED',
      'SUCCESSFUL_PASSWORD_RESET', 'CHALLENGE_RESPONSE_REQUIRED', 'USERNAME_RECOVERY_EMAIL_REQUIRED',
      'USERNAME_RECOVERY_EMAIL_SENT', 'SUCCESSFUL_ACCOUNT_UNLOCK', 'IDENTIFIER_REQUIRED',
      'EXTERNAL_AUTHENTICATION_COMPLETED', 'EXTERNAL_AUTHENTICATION_FAILED', 'EXTERNAL_AUTHENTICATION_REQUIRED',
      'DEVICE_PROFILE_REQUIRED', 'REGISTRATION_REQUIRED', 'REFERENCE_ID_REQUIRED','CURRENT_CREDENTIALS_REQUIRED',
      'DEVICE_SELECTION_REQUIRED', 'MFA_COMPLETED', 'MFA_FAILED', 'OTP_REQUIRED', 'ASSERTION_REQUIRED',
      'PUSH_CONFIRMATION_REJECTED', 'PUSH_CONFIRMATION_TIMED_OUT', 'PUSH_CONFIRMATION_WAITING',
      'ID_VERIFICATION_FAILED', 'ID_VERIFICATION_REQUIRED', 'ID_VERIFICATION_TIMED_OUT', 'ACCOUNT_LINKING_FAILED',
      'SECURID_CREDENTIAL_REQUIRED', 'SECURID_NEXT_TOKENCODE_REQUIRED', 'SECURID_REAUTHENTICATION_REQUIRED',
      'SECURID_SYSTEM_PIN_RESET_REQUIRED', 'SECURID_USER_PIN_RESET_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED',
      'MFA_SETUP_REQUIRED', 'DEVICE_PAIRING_METHOD_REQUIRED'];
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

  static paOnAuthorizationRequest = paOnAuthorizationRequest;
  static paOnAuthorizationSuccess = paOnAuthorizationSuccess;

  /*
   * Constructs a new AuthnWidget object
   * @param {string} baseUrl Required: PingFederate Base Url
   * @param {string} divId Required: the div Id where the widget will display the UI html associated per state
   * @param {object} options object containing additional options such as flowId and divId
   */
  constructor(baseUrl, options) {
    let flowId = (options && options.flowId) || this.getBrowserFlowId();
    this.divId = (options && options.divId) || 'authnwidget';
    if (!baseUrl) {
      throw new Error(AuthnWidget.BASE_URL_REQUIRED_MSG);
    }
    this.captchaDivId = 'invisibleRecaptchaId';
    this.assets = new Assets(options);
    this.invokeReCaptcha = options && options.invokeReCaptcha;
    let checkRecaptcha = options && options.checkRecaptcha;
    this.grecaptcha = options && options.grecaptcha;
    this.deviceProfileScript = options && options.deviceProfileScript;
    this.dispatch = this.dispatch.bind(this);
    this.render = this.render.bind(this);
    this.defaultEventHandler = this.defaultEventHandler.bind(this);
    this.handleIdFirstLinks = this.handleIdFirstLinks.bind(this);
    this.registerIdFirstLinks = this.registerIdFirstLinks.bind(this);
    this.handleAltAuthSource = this.handleAltAuthSource.bind(this);
    this.registerAltAuthSourceLinks = this.registerAltAuthSourceLinks.bind(this);
    this.resumeToPf = this.resumeToPf.bind(this);
    this.openExternalAuthnPopup = this.openExternalAuthnPopup.bind(this);
    this.externalAuthnFailure = this.externalAuthnFailure.bind(this);
    this.postContinueAuthentication = this.postContinueAuthentication.bind(this);
    this.registerReopenPopUpHandler = this.registerReopenPopUpHandler.bind(this);
    this.handleReopenPopUp = this.handleReopenPopUp.bind(this);
    this.registerRegistrationLinks = this.registerRegistrationLinks.bind(this);
    this.handleRegisterUser = this.handleRegisterUser.bind(this);
    this.verifyRegistrationPassword = this.verifyRegistrationPassword.bind(this);
    this.postDeviceProfileAction = this.postDeviceProfileAction.bind(this);
    this.registerAgentlessHandler = this.registerAgentlessHandler.bind(this);
    this.handleAgentlessSignOn = this.handleAgentlessSignOn.bind(this);
    this.postEmptyAuthentication = this.postEmptyAuthentication.bind(this);
    this.handleMfaDeviceSelection = this.handleMfaDeviceSelection.bind(this);
    this.handleMfaSetDefaultDeviceSelection = this.handleMfaSetDefaultDeviceSelection.bind(this);
    this.registerMfaEventHandler = this.registerMfaEventHandler.bind(this);
    this.registerMfaChangeDeviceEventHandler = this.registerMfaChangeDeviceEventHandler.bind(this);
    this.handleMfaDeviceChange = this.handleMfaDeviceChange.bind(this);
    this.registerMfaUsePasscodeEventHandler = this.registerMfaUsePasscodeEventHandler.bind(this);
    this.handleMfaUsePasscode = this.handleMfaUsePasscode.bind(this);
    this.postPushNotificationWait = this.postPushNotificationWait.bind(this);
    this.registerIdVerificationRequiredEventHandler = this.registerIdVerificationRequiredEventHandler.bind(this);
    this.postIdVerificationRequired = this.postIdVerificationRequired.bind(this);
    this.handleIdVerificationInProgress = this.handleIdVerificationInProgress.bind(this);
    this.handleIdVerificationFailed = this.handleIdVerificationFailed.bind(this);
    this.checkSecurIdPinReset = this.checkSecurIdPinReset.bind(this);
    this.postAssertionRequired = this.postAssertionRequired.bind(this);
    this.postDeviceSelectionRequired = this.postDeviceSelectionRequired.bind(this);
    this.showDeviceManagementPopup = this.showDeviceManagementPopup.bind(this);
    this.hideDeviceManagementPopup = this.hideDeviceManagementPopup.bind(this);
    this.pollCheckGet = this.pollCheckGet.bind(this);
    this.postEmailVerificationRequired = this.postEmailVerificationRequired.bind(this);
    this.registerMfaDevicePairingEventHandler = this.registerMfaDevicePairingEventHandler.bind(this);
    this.handleMfaDevicePairingSelection = this.handleMfaDevicePairingSelection.bind(this);
    this.stateTemplates = new Map();  //state -> handlebar templates
    this.eventHandler = new Map();  //state -> eventHandlers
    this.postRenderCallbacks = new Map();
    this.actionModels = new Map();
    this.store = new Store(flowId, baseUrl, checkRecaptcha, options);
    this.store.registerListener(this.render);
    AuthnWidget.CORE_STATES.forEach(state => this.registerState(state));

    this.addEventHandler('IDENTIFIER_REQUIRED', this.registerIdFirstLinks);
    this.addEventHandler('USERNAME_PASSWORD_REQUIRED', this.registerAltAuthSourceLinks);
    this.addEventHandler('REGISTRATION_REQUIRED', this.registerRegistrationLinks);
    this.addEventHandler('REGISTRATION_REQUIRED', this.registerAltAuthSourceLinks);
    this.addEventHandler('EXTERNAL_AUTHENTICATION_COMPLETED', this.postContinueAuthentication);
    this.addEventHandler('EXTERNAL_AUTHENTICATION_REQUIRED', this.registerReopenPopUpHandler);
    this.addPostRenderCallback('RESUME', this.resumeToPf);
    this.addPostRenderCallback('EXTERNAL_AUTHENTICATION_REQUIRED', this.openExternalAuthnPopup);
    this.addPostRenderCallback('EXTERNAL_AUTHENTICATION_FAILED', this.externalAuthnFailure);
    this.addEventHandler('DEVICE_PROFILE_REQUIRED', this.postDeviceProfileAction);
    this.addEventHandler('REFERENCE_ID_REQUIRED', this.registerAgentlessHandler);
    this.addPostRenderCallback('AUTHENTICATION_REQUIRED', this.postEmptyAuthentication);
    this.addPostRenderCallback('MFA_COMPLETED', this.postContinueAuthentication);
    this.addEventHandler('DEVICE_SELECTION_REQUIRED', this.registerMfaEventHandler);
    this.addPostRenderCallback('DEVICE_SELECTION_REQUIRED', this.postDeviceSelectionRequired);
    this.addEventHandler('OTP_REQUIRED', this.registerMfaEventHandler);
    this.addEventHandler('OTP_REQUIRED', this.registerMfaChangeDeviceEventHandler);
    this.addEventHandler('ASSERTION_REQUIRED', this.registerMfaEventHandler);
    this.addEventHandler('ASSERTION_REQUIRED', this.registerMfaChangeDeviceEventHandler);
    this.addPostRenderCallback('ASSERTION_REQUIRED', this.postAssertionRequired);
    this.addEventHandler('PUSH_CONFIRMATION_WAITING', this.registerMfaUsePasscodeEventHandler);
    this.addPostRenderCallback('PUSH_CONFIRMATION_WAITING', this.postPushNotificationWait);
    this.addEventHandler('PUSH_CONFIRMATION_WAITING', this.registerMfaChangeDeviceEventHandler);
    this.addEventHandler('PUSH_CONFIRMATION_TIMED_OUT', this.registerMfaEventHandler);
    this.addEventHandler('PUSH_CONFIRMATION_TIMED_OUT', this.registerMfaChangeDeviceEventHandler);
    this.addPostRenderCallback('MOBILE_PAIRING_REQUIRED', this.postContinueAuthentication);
    this.addEventHandler('ID_VERIFICATION_REQUIRED', this.registerIdVerificationRequiredEventHandler);
    this.addPostRenderCallback('ID_VERIFICATION_REQUIRED', this.postIdVerificationRequired);
    this.addPostRenderCallback('ID_VERIFICATION_IN_PROGRESS', this.handleIdVerificationInProgress);
    this.addPostRenderCallback('ID_VERIFICATION_COMPLETED', this.postContinueAuthentication);
    this.addEventHandler('ID_VERIFICATION_FAILED', this.handleIdVerificationFailed);
    this.addEventHandler('SECURID_USER_PIN_RESET_REQUIRED', this.checkSecurIdPinReset);
    this.addPostRenderCallback('EMAIL_VERIFICATION_REQUIRED', this.postEmailVerificationRequired);
    this.addEventHandler('DEVICE_PAIRING_METHOD_REQUIRED', this.registerMfaDevicePairingEventHandler);

    this.actionModels.set('checkUsernamePassword', { required: ['username', 'password'], properties: ['username', 'password', 'rememberMyUsername', 'thisIsMyDevice', 'captchaResponse'] });
    this.actionModels.set('initiateAccountRecovery', { properties: ['usernameHint'] });
    this.actionModels.set('useAlternativeAuthenticationSource', { required: ['authenticationSource'], properties: ['authenticationSource'] });
    this.actionModels.set('checkUsernameRecoveryEmail', { required: ['email'], properties: ['email', 'captchaResponse'] });
    this.actionModels.set('checkAccountRecoveryUsername', { required: ['username'], properties: ['username', 'captchaResponse'] });
    this.actionModels.set('checkNewPassword', { required: ['username', 'newPassword'], properties: ['username', 'existingPassword', 'newPassword', 'captchaResponse'] });
    this.actionModels.set('checkCurrentCredentials', { required: ['username', 'password'], properties: ['username', 'password', 'captchaResponse'] });
    this.actionModels.set('checkPasswordReset', { required: ['newPassword'], properties: ['newPassword'] });
    this.actionModels.set('checkRecoveryCode', { required: ['recoveryCode'], properties: ['recoveryCode'] });
    this.actionModels.set('checkChallengeResponse', { required: ['challengeResponse'], properties: ['challengeResponse'] });
    this.actionModels.set('submitIdentifier', { required: ['identifier'], properties: ['identifier'] });
    this.actionModels.set('clearIdentifier', { required: ['identifier'], properties: ['identifier'] });
    this.actionModels.set('registerUser', {required: ['password', 'fieldValues'], properties: ['password', 'captchaResponse', 'fieldValues', 'thisIsMyDevice']});
    this.actionModels.set('checkOtp', {required: ['otp']});
    this.actionModels.set('checkAssertion', {required: ['assertion', 'origin', 'compatibility'],  properties: ['assertion', 'origin', 'compatibility'] });
    this.actionModels.set('checkCredential', { required: ['passcode'], properties: ['username', 'passcode'] });
    this.actionModels.set('checkNextTokencode', { required: ['tokencode'], properties: ['tokencode'] });
    this.actionModels.set('checkPasscode', { required: ['passcode'], properties: ['passcode'] });
    this.actionModels.set('resetPin', { required: ['newPin', 'confirmPin'], properties: ['newPin', 'confirmPin'] });
  }

  init() {
    try {
      if (!this.store.flowId) {
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
    document.querySelector('#spinnerId').style.display = 'block';
  }

  initRedirectless(configuration) {
    // input validation
    try {
      console.log(configuration);
      redirectlessConfigValidator(configuration);
      this.addPostRenderCallback('COMPLETED', (state) => completeStateCallback(state, configuration));
      this.store
        .dispatch('INIT_REDIRECTLESS', null, configuration)
        .catch((err) => this.generalErrorRenderer(err.message));
    } catch (err) {
      this.generalErrorRenderer(err.message);
    }
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

    let dropdowns = document.querySelectorAll(`#${this.divId} select`);
    this.checkDropdownSelected = this.checkDropdownSelected.bind(this);
    if (dropdowns) {
      dropdowns.forEach(dropdown => {
        dropdown.addEventListener('change', this.onChangeDropdown);
        this.checkDropdownSelected(dropdown);
      });
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
    Array.from(document.querySelectorAll('[data-idfirstaction]')).forEach(element => element.addEventListener('click', this.handleIdFirstLinks));
  }

  registerRegistrationLinks() {
    Array.from(document.querySelectorAll('[data-registrationactionid]')).forEach(element => element.addEventListener('click', this.handleRegisterUser));
    Array.from(document.querySelectorAll("select.required, input[type='date'].required, input.required[type='checkbox']")).forEach(element => element.addEventListener('change', this.enableSubmit));
    Array.from(document.querySelectorAll("input[type='password']")).forEach(element => element.addEventListener('input', this.verifyRegistrationPassword));
  }

  handleIdFirstLinks(evt) {
    evt.preventDefault();
    let source = evt.target || evt.srcElement;
    let actionId = source.dataset['idfirstaction'];
    let identifier = source.dataset['identifier'];
    let data = {
      identifier
    };
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

  registerAltAuthSourceLinks() {
    Array.from(document.querySelectorAll('[data-altauthsource]')).forEach(element => element.addEventListener('click', this.handleAltAuthSource))
  }

  handleAltAuthSource(evt) {
    evt.preventDefault();
    let source = evt.currentTarget;
    if (source) {
      let authSource = source.dataset['altauthsource'];
      let data = {
        "authenticationSource": authSource
      };
      this.store.dispatch('POST_FLOW', "useAlternativeAuthenticationSource", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch alternate auth source as the target was null");
    }
  }

  resumeToPf() {
    window.location.replace(this.store.getStore().resumeUrl);
  }

  openExternalAuthnPopup() {
    if (this.store.getStore().presentationMode === 'REDIRECT') {
      window.location.replace(this.store.getStore().authenticationUrl);
    } else {
      if (document.querySelector("#externalAuthnHeaderId")) {
        document.querySelector('#externalAuthnHeaderId').style.display = 'block';
      }
      if (this.store.getStore().status !== this.store.getPreviousStore().status) {
        let windowReference = window.open(this.store.getStore().authenticationUrl, "_blank", "width=500px,height=500px");
        this.checkPopupStatus(windowReference);
      }
    }
  }

  externalAuthnFailure() {
    if (this.store.getStore().errorUrl) {
      window.location.replace(this.store.getStore().errorUrl);
    }
  }

  postContinueAuthentication() {
    if (document.querySelector("#spinnerId")) {
      document.querySelector('#spinnerId').style.display = 'block';
    }
    setTimeout(() => {
      this.store.dispatch('POST_FLOW', 'continueAuthentication', '{}');
    }, 1000)
  }

  postEmailVerificationRequired() {
    if (this.store.getStore().status == this.store.getPreviousStore().status) {
      clearTimeout(this.emailVerificationRequiredStateTimeout);
      this.emailVerificationRequiredStateTimeout = setTimeout(() => {
        if (document.querySelector("#notification")) {
          document.querySelector('#notification').style.display = 'none';
        }
      }, 5000)
    }
  }

  registerMfaDevicePairingEventHandler() {
    Array.from(document.querySelectorAll('[data-mfa-device-pairing-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaDevicePairingSelection));
  }

  handleMfaDevicePairingSelection(evt) {
    evt.preventDefault();
    let source = evt.currentTarget;
    if (source) {
      let devicePairingMethod = source.dataset['mfaDevicePairingSelection'].split('.');
      let data = {
        'devicePairingMethod': {
          'deviceType': devicePairingMethod[0]
        }
      };
      if (devicePairingMethod.length > 1 && devicePairingMethod[1] !== '') {
        data['devicePairingMethod']['applicationName'] = devicePairingMethod[1];
      }
      this.store.dispatch('POST_FLOW', "selectDevicePairingMethod", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  registerReopenPopUpHandler() {
    Array.from(document.querySelectorAll('[data-externalAuthActionId]'))
      .forEach(element => element.addEventListener('click', this.handleReopenPopUp));
  }

  handleReopenPopUp(evt) {
    evt.preventDefault();
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


  postAssertionRequired()
  {
    let data = this.store.getStore();
    var selectedDevice = data.devices.filter(device => {return device.id === data.selectedDeviceRef.id;});
    getCompatibility().then(value => {
      // compare value with received, if there is no match, trigger cancel flow
      // PLATFORM - FULL
      // SECURITY_KEY - SECURITY_KEY_ONLY
      if ( (selectedDevice[0].type === 'SECURITY_KEY' && value === 'NONE') || (selectedDevice[0].type === 'PLATFORM' && value !== 'FULL') )
      {
        // Cancel authentication if this is the only device so we don't loop
        console.log("No acceptable authenticator");
        if(data.devices.length == 1)
        {
          // Hide back button and all other stuff. Only Cancel is allowed
          document.querySelector('#assertionRequiredSpinnerId').style.display = 'none';
          document.querySelector('#assertionRequiredAuthenticatingId').style.display = 'none';
          document.querySelector('#unsupportedDeviceId').style.display = 'block';
          document.querySelector('#changeDevice').style.display = 'none';
          document.querySelector('#deviceInfoBlockId').style.display = 'none';
        }
        else
        {
          // Hide spinner and info section, show error so user can go back to device selection if required or cancel
          document.querySelector('#assertionRequiredSpinnerId').style.display = 'none';
          document.querySelector('#assertionRequiredAuthenticatingId').style.display = 'none';
          document.querySelector('#unsupportedDeviceId').style.display = 'block';
          document.querySelector('#deviceInfoBlockId').style.display = 'none';
        }
      }
      else
      {
        doWebAuthn(this);
      }
    });
  }

  postDeviceSelectionRequired() {
    let data = this.store.getStore();
    if(data.userSelectedDefault === false)
    {
      var deviceKebabMenus = document.querySelectorAll('#kebab-menu-icon-id');
      [].forEach.call(deviceKebabMenus, function(deviceKebabMenu) {
        deviceKebabMenu.style.display = "none";
      });
    }

    getCompatibility().then(value => {
      if (value === 'SECURITY_KEY_ONLY')
      {
        var platformDevices = document.querySelectorAll("[id^='PLATFORM-']");
        [].forEach.call(platformDevices, function(platformDevice) {
          platformDevice.style.display = "none";
        });
      }
      else if (value === 'NONE')
      {
        var platformDevices = document.querySelectorAll("[id^='PLATFORM-']");
        [].forEach.call(platformDevices, function(platformDevice) {
          platformDevice.style.display = "none";
        });

        var securityKeyDevices = document.querySelectorAll("[id^='SECURITY_KEY-']");
        [].forEach.call(securityKeyDevices, function(securityKeyDevice) {
          securityKeyDevice.style.display = "none";
        });
      }
    });
  }

  postDeviceProfileAction() {
    let data = this.store.getStore();
    let script;
    switch (data.deviceProfilingType) {
      case 'IDW':
      case 'TMX-WEB':
        script = document.createElement('script');
        script.src = data.deviceProfilingScriptUrl;
        document.head.appendChild(script);

        setTimeout(() => {
          this.store.dispatch('POST_FLOW', 'continueAuthentication', '{}');
        }, parseInt(data.deviceProfilingTimeoutMillis));
        break;
      case 'TMX-SDK':
        script = document.createElement('script');
        script.src = this.deviceProfileScript;
        script.onload = function() {
          pinghelper.run_sid_provided(data.deviceProfilingDomain,
            data.riskOrgId,
            data.riskSessionId);
        }
        document.head.appendChild(script);

        setTimeout(() => {
          this.store.dispatch('POST_FLOW', 'continueAuthentication', '{}');
        }, parseInt(data.deviceProfilingTimeoutMillis));
        break;
      case 'PINGONE-RISK': {
        script = document.createElement('script');
        script.src = this.deviceProfileScript;
        const onCompletion = (components) => {
          const deviceProfile = transformComponentsToDeviceProfile(components);
          this.store.dispatch('POST_FLOW', 'submitDeviceProfile', JSON.stringify(deviceProfile));
        };
        script.onload = () => {
          profileDevice(onCompletion);
        }
        document.head.appendChild(script);

        setTimeout(() => {
          this.store.dispatch('POST_FLOW', 'submitDeviceProfile');
        }, parseInt(data.deviceProfilingTimeoutMillis));
        break;
      }
    }
  }

  postEmptyAuthentication() {
    if (document.querySelector("#spinnerId")) {
      document.querySelector('#spinnerId').style.display = 'block';
    }
    this.store.dispatch('POST_FLOW', 'authenticate', '{}');
  }

  registerMfaEventHandler() {
    Array.from(document.querySelectorAll('[data-mfa-selection-kebab-menu-container]'))
      .forEach(element => element.addEventListener('click', this.showDeviceManagementPopup));

    Array.from(document.querySelectorAll('[data-mfa-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaDeviceSelection));

    document.addEventListener('click', this.hideDeviceManagementPopup);

    Array.from(document.querySelectorAll("[id^='device-management-popup-frame']"))
      .forEach(element => element.addEventListener('click', this.handleMfaSetDefaultDeviceSelection));
  }

  handleMfaDeviceSelection(evt) {
    evt.preventDefault();
    let source = evt.currentTarget;
    if (source) {
      let deviceId = source.dataset['mfaSelection'];
      let data = {
        "deviceRef": {
          "id": deviceId
        }
      };
      this.store.dispatch('POST_FLOW', "selectDevice", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  showDeviceManagementPopup(evt) {
    evt.stopPropagation();
    // close other popups if any
    var popupDivs = document.querySelectorAll("[id^='device-management-popup-frame']");
    for (var i = 0; i < popupDivs.length; ++i) {
      var popupDisplayStatus = popupDivs[i].style.display;
      if (popupDisplayStatus === 'block') {
        popupDivs[i].style.display = 'none';
      }
    }
    let source = evt.currentTarget;
    var deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
    var docId = 'device-management-popup-frame-' + deviceId;
    document.getElementById(docId).style.display = 'block';
  }

  hideDeviceManagementPopup(evt) {
    var target = evt.target;
    var kebabMenuDivs = document.querySelectorAll("[id='kebab-menu-svg-id']");
    for (var i = 0; i < kebabMenuDivs.length; ++i) {
      if (kebabMenuDivs[i] == target) {
        return;
      }
    }

    var popupDivs = document.querySelectorAll("[id^='device-management-popup-frame']");
    for (var i = 0; i < popupDivs.length; ++i) {
      var popupDisplayStatus = popupDivs[i].style.display;
      if (popupDisplayStatus === 'block') {
        popupDivs[i].style.display = 'none';
      }
    }
  }

  handleMfaSetDefaultDeviceSelection(evt) {
    evt.stopPropagation();
    let source = evt.currentTarget;
    if (source) {
      let deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
      let data = {
        "deviceRef": {
          "id": deviceId
        }
      };
      this.store.dispatch('POST_FLOW', "setDefaultDevice", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  registerMfaChangeDeviceEventHandler() {
    document.getElementById('changeDevice')
            .addEventListener('click', this.handleMfaDeviceChange);
  }

  async handleMfaDeviceChange(evt) {
    evt.preventDefault();
    let state = await this.store.getState();
    if (this.pollPushNoticationState) {
      clearTimeout(this.pollPushNoticationState);
    }
    state.status = 'DEVICE_SELECTION_REQUIRED';
    this.render(this.store.getPreviousStore(), state);
  }

  registerMfaUsePasscodeEventHandler() {
    if (document.getElementById('usePasscode')) {
      document.getElementById('usePasscode')
        .addEventListener('click', this.handleMfaUsePasscode);
    }
  }

  async handleMfaUsePasscode(evt) {
    evt.preventDefault();
    clearTimeout(this.pollPushNoticationState);
    let storeState = this.store.getStore();
    storeState.status = 'OTP_REQUIRED';
    this.render(this.store.getPreviousStore(), storeState);
  }

  async postPushNotificationWait() {
    let storeState = this.store.getStore();
    if (storeState.status === 'OTP_REQUIRED') {
      this.render(this.store.getPreviousStore(), storeState);
      return;
    } else if (storeState.errorCode === 'VALIDATION_ERROR') {
      if (storeState.errorDetailCodes && storeState.errorDetailCodes.includes('INVALID_OTP')) {
        storeState.status = 'OTP_REQUIRED';
        this.render(this.store.getPreviousStore(), storeState);
        return;
      }
    }

    if (document.querySelector("#spinnerId")) {
      document.querySelector('#spinnerId').style.display = 'block';
    }

    let pollState = await this.store.getState();
    if (pollState.status === 'PUSH_CONFIRMATION_WAITING') {
      // continue waiting
      clearTimeout(this.pollPushNoticationState);
      this.pollPushNoticationState = setTimeout(() => {
        this.postPushNotificationWait();
      }, 1000);
    } else {
      clearTimeout(this.pollPushNoticationState);
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    }
  }

  registerAgentlessHandler() {
    console.log("registering event handlers for 'data-agentlessActionid' elements in 'reference_id_required.hbs'");
    Array.from(document.querySelectorAll('[data-agentlessActionid]')).
    forEach(element => element.addEventListener('click', this.handleAgentlessSignOn));
  }

  handleAgentlessSignOn(evt) {
    console.log("send credentials to authentication service");
    console.log("complete state `checkReferenceId` action with new REF ID returned");
  }

  verifyPasswordsMatch() {
    let pass1 = document.querySelector('#newpassword');
    let pass2 = document.querySelector('#verifypassword');
    if (pass1.value !== pass2.value) {
      let errors = [];
      errors.push('New passwords do not match.');
      this.store.dispatchErrors(errors);
      return false;
    } else {
      this.store.clearErrors();
    }
    return true;
  }

  enableSubmit() {
    let nodes = document.querySelectorAll('input.required[type=text]:not(:disabled), ' +
      'input.required[type=password]:not(:disabled), input.required[type=email]:not(:disabled), ' +
      'select.required:not(:disabled), input.required[type=date]:not(:disabled), ' +
      'div.checkbox__single.required > label > input.required[type=checkbox]:not(:disabled)');
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
        if (input.type === 'text' && input.id === 'otp') {
          if (input.value.length !== 6) {
            disabled = true;
          }
        }
        if (input.type === 'checkbox') {
          if (!input.checked) {
            disabled = true;
          }
        }
      });
    }
    let checkboxGroups = document.querySelectorAll("div.required.checkbox__group")
    if (checkboxGroups) {
      checkboxGroups.forEach(checkboxes => {
        let oneChecked = false;
        let inputs = checkboxes.querySelectorAll("input:not(:disabled)")
        if (inputs) {
          inputs.forEach(checkbox => {
            if (checkbox.checked) {
              oneChecked = true;
            }
          })
        } else {
          oneChecked = true;
        }
        if (!oneChecked) {
          disabled = true;
        }
      })
    }
    document.querySelector('#submit').disabled = disabled;
  }

  async registerIdVerificationRequiredEventHandler() {
    let data = this.store.getStore();

    if (data.errorDetails !== undefined)
    {
      document.getElementById("requiredDescription").style.display = "none";
      document.getElementById("errorDescription").style.display = "block";
    }
    else
    {
      document.getElementById("requiredDescription").style.display = "block";
      document.getElementById("errorDescription").style.display = "none";
    }

    const options = {
      method: 'GET'
    }
    let qrUrlRespone = await fetch(data.qrUrl, options);
    let qrCode = await qrUrlRespone.text();
    document.getElementById('qrCode').src = qrCode;
    document.getElementById('qrCodeBlock').style.display = 'block';

    var verificationCodeToken = data.verificationCode.match(/.{1,4}/g);
    document.getElementById('verificationCode').innerHTML = verificationCodeToken.join(' ');
  }

  postIdVerificationRequired() {
    document.getElementById('copy')
            .addEventListener('click', this.copyCode);

    this.pollCheckGet(this.store.getStore().verificationCode, 5000);
  }

  handleIdVerificationInProgress() {
    setTimeout(() => {
      this.store.dispatch('POST_FLOW', 'poll', '{}');
    }, 5000)
  }

  handleIdVerificationFailed() {
    let data = this.store.getStore();

    if (data.errorDetails !== undefined)
    {
      document.getElementById("errorMessage").innerHTML = this.makeIdVerificationErrorMessage(data.errorDetails);
    }
  }

  copyCode(event) {
    event.preventDefault();
    let range = document.createRange();
    range.selectNode(document.getElementById('verificationCode'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }

  async pollCheckGet(currentVerificationCode, timeout) {
    let fetchUtil = this.store.fetchUtil;
    let result = await fetchUtil.postFlow(this.store.flowId, 'poll', '{}');
    let newState = await result.json();

    let pollAgain =
      (newState.status === 'ID_VERIFICATION_REQUIRED') &&
      (newState.verificationCode === currentVerificationCode);

    if (!pollAgain) {
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    }
    else {
      setTimeout(() => {
        this.pollCheckGet(currentVerificationCode, timeout);
      }, timeout)
    }
  }

  makeIdVerificationErrorMessage(errorDetails) {
    var errorMessage = '';

    errorDetails.forEach(errorDetail =>
      {
        if (errorMessage === '') {
          errorMessage = errorDetail.userMessage
        }
        else {
          var append = '<br>' + errorDetail.userMessage
          errorMessage += append
        }
      })

    return errorMessage;
  }

  checkSecurIdPinReset() {
    Array.from(document.querySelectorAll("input[type='password']")).forEach(element => element.addEventListener('input', this.checkPinMatch));
  }

  checkPinMatch() {
    var status = document.getElementById('pinStatus');
    var errorMessage = document.getElementById('errorMessage');
    var pin = document.getElementById("newPin").value;
    var confirmPin = document.getElementById("confirmPin").value;

    if (pin.length === 0 || confirmPin.length === 0) {
      status.style.display = 'none';
      return;
    } else {
      status.style.display = 'block';
    }

    if (pin === confirmPin) {
      status.classList.remove('text-input__icon--error');
      errorMessage.style.display = "none";
      status.classList.add('text-input__icon--success');
    } else {
      status.classList.remove('text-input__icon--success');
      status.classList.add('text-input__icon--error');
      errorMessage.style.display = "block";
      document.querySelector('#submit').disabled = true;
    }
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

    this.dispatchWithCaptcha(actionId, formData)
  }

  dispatchWithCaptcha(actionId, formData) {
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
      let convertedData = {};
      let object = {};

      // Convert formData to a map. IE11 has incredibly limited support for the FormData type and corresponding methods.
      let formDataEntries = formData.entries(), formDataEntry = formDataEntries.next(), pair;
      while (!formDataEntry.done) {
        pair = formDataEntry.value;
        convertedData[pair[0]] = pair[1];
        formDataEntry = formDataEntries.next();
      }

      for(let key in convertedData) {
        let values = formData.getAll(key);
        if(this.isMultiValueField(formElement, key))
          object[key] = values;
        else
          object[key] = values[0]
      }

      return object;
    }
  }

  isMultiValueField(formElement, name) {
    let inputs = formElement.querySelectorAll("input[name='" + name + "']");
    console.log(inputs);
    let count = 0;

    if (inputs) {
      inputs.forEach(element => {
        if (element.name === name) {
          count++;
        }
      });
    }

    return count > 1;
  }

  render(prevState, state) {
    let currentState = state.status;
    let template = this.getTemplate('general_error');
    if (currentState) {
      try {
        template = this.getTemplate(currentState);
      } catch (e) {
        console.log(`Failed to load template: ${currentState}.`);
        template = this.getTemplate('general_error');
      }
    }
    let widgetDiv = document.getElementById(this.divId);
    var params = Object.assign(state, this.assets.toTemplateParams())
    widgetDiv.innerHTML = template(params);
    this.registerEventListeners(currentState);
    if (this.postRenderCallbacks[currentState]) {
      this.postRenderCallbacks[currentState](state);
    }
    if (this.store.state.showCaptcha && this.grecaptcha) {
      this.grecaptcha.render(this.captchaDivId);
    }

    let autofocusInput = document.querySelector("input:not(:disabled)[autofocus]")
    if (!autofocusInput) {
      let firstInput = document.querySelector("input[type=text]:not(:disabled), input[type=email]:not(:disabled), " +
        "input[type=date]:not(:disabled), input[type=phone]:not(:disabled), input[type=password]:not(:disabled)");
      if (firstInput) {
        firstInput.focus();
      }
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
      if (document.querySelector("#spinnerId")) {
        document.querySelector('#spinnerId').style.display = 'none';
      }
      if (document.querySelector("#externalAuthnId")) {
        document.querySelector('#externalAuthnId').style.display = 'block';
      }
    }
  }

  onChangeDropdown(event) {
    event.target.classList.remove("placeholder-shown");
  }

  checkDropdownSelected(field) {
    let selected_options = field.querySelectorAll(`option[selected]`);
    if(selected_options.length > 0)
      field.classList.remove("placeholder-shown");
  }

  handleRegisterUser(event) {
    event.preventDefault();
    let formData = this.getFormData();
    let actionModelProperties = this.actionModels.get('registerUser').properties;

    let payload = {fieldValues: {}};
    Object.keys(formData).forEach((key) => {
      if(actionModelProperties.indexOf(key) >= 0)
        payload[key] = formData[key];
      else {
        let field_value = formData[key];

        if(Array.isArray(field_value)) {
          let values = {};
          field_value.forEach(option => {
            values[option] = true;
          });
          field_value = values;
        }

        payload.fieldValues[key] = field_value;
      }
    });

    this.dispatchWithCaptcha("registerUser", payload)
  }

  verifyRegistrationPassword() {
    let status = document.getElementById('passwordStatus');

    let pass1 = document.querySelector('#newpassword');
    let pass2 = document.querySelector('#password');

    if (pass1.value.length === 0 || pass2.value.length === 0) {
      status.style.display = 'none';
      return;
    } else {
      status.style.display = 'block';
    }

    if (pass1.value === pass2.value) {
      status.classList.remove('text-input__icon--error');
      status.classList.add('text-input__icon--success');
    } else {
      status.classList.remove('text-input__icon--success');
      status.classList.add('text-input__icon--error');
      document.querySelector('#submit').disabled = true;
    }
  }
}
