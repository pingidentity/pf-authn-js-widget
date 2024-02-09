import Assets from './utils/assets';
import queryString from 'query-string';
import 'core-js/stable';
import 'regenerator-runtime/runtime'; //for async await
import Store from './store';
import redirectlessConfigValidator from './validators/redirectless';
import { getCompatibility, doWebAuthn, doRegisterWebAuthn } from './utils/fidoFlowUtil';
import { completeStateCallback, failedStateCallback, FLOW_TYPE_USER_AUTHZ, FLOW_TYPE_AUTHZ } from './utils/redirectless';
import paOnAuthorizationRequest from './utils/paOnAuthorizationRequest';
import paOnAuthorizationSuccess from './utils/paOnAuthorizationSuccess';
import './scss/main.scss';
import {isValidEmail, isValidPhone} from "./validators/inputs";
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
    const oauthUserAuthorizationStates = [
      'OAUTH_DEVICE_USER_CODE_REQUIRED',
      'OAUTH_DEVICE_USER_CODE_CONFIRMATION_REQUIRED',
      'OAUTH_DEVICE_COMPLETED'
    ]

    const oneTimeDeviceOtpStates = [
      'ONE_TIME_DEVICE_OTP_METHOD_TYPE_INPUT_REQUIRED',
      'ONE_TIME_DEVICE_OTP_INPUT_REQUIRED'
    ]

    const idVerificationStates = [
      'ID_VERIFICATION_FAILED',
      'ID_VERIFICATION_REQUIRED',
      'ID_VERIFICATION_TIMED_OUT',
      'ID_VERIFICATION_DEVICE',
      'ID_VERIFICATION_OPTIONS',
    ]

    return ['USERNAME_PASSWORD_REQUIRED', 'MUST_CHANGE_PASSWORD', 'CHANGE_PASSWORD_EXTERNAL', 'NEW_PASSWORD_RECOMMENDED',
      'NEW_PASSWORD_REQUIRED', 'SUCCESSFUL_PASSWORD_CHANGE', 'ACCOUNT_RECOVERY_USERNAME_REQUIRED',
      'ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED', 'RECOVERY_CODE_REQUIRED', 'PASSWORD_RESET_REQUIRED',
      'SUCCESSFUL_PASSWORD_RESET', 'CHALLENGE_RESPONSE_REQUIRED', 'USERNAME_RECOVERY_EMAIL_REQUIRED',
      'USERNAME_RECOVERY_EMAIL_SENT', 'SUCCESSFUL_ACCOUNT_UNLOCK', 'IDENTIFIER_REQUIRED',
      'EXTERNAL_AUTHENTICATION_COMPLETED', 'EXTERNAL_AUTHENTICATION_FAILED', 'EXTERNAL_AUTHENTICATION_REQUIRED',
      'DEVICE_PROFILE_REQUIRED', 'REGISTRATION_REQUIRED', 'REFERENCE_ID_REQUIRED','CURRENT_CREDENTIALS_REQUIRED',
      'DEVICE_SELECTION_REQUIRED', 'MFA_COMPLETED', 'MFA_FAILED', 'OTP_REQUIRED', 'ASSERTION_REQUIRED',
      'PUSH_CONFIRMATION_REJECTED', 'PUSH_CONFIRMATION_TIMED_OUT', 'PUSH_CONFIRMATION_WAITING', 'ACCOUNT_LINKING_FAILED',
      'SECURID_CREDENTIAL_REQUIRED', 'SECURID_NEXT_TOKENCODE_REQUIRED', 'SECURID_REAUTHENTICATION_REQUIRED',
      'SECURID_SYSTEM_PIN_RESET_REQUIRED', 'SECURID_USER_PIN_RESET_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'EMAIL_VERIFICATION_OTP_REQUIRED',
      'MFA_SETUP_REQUIRED', 'DEVICE_PAIRING_METHOD_REQUIRED', 'EMAIL_PAIRING_TARGET_REQUIRED',
      'EMAIL_ACTIVATION_REQUIRED', 'SMS_PAIRING_TARGET_REQUIRED', 'SMS_ACTIVATION_REQUIRED',
      'VOICE_PAIRING_TARGET_REQUIRED', 'VOICE_ACTIVATION_REQUIRED', 'TOTP_ACTIVATION_REQUIRED', 'PLATFORM_ACTIVATION_REQUIRED',
      'SECURITY_KEY_ACTIVATION_REQUIRED', 'MOBILE_ACTIVATION_REQUIRED', 'MFA_DEVICE_PAIRING_METHOD_FAILED',
      'VIP_ENROLLMENT', 'VIP_CREDENTIAL_REQUIRED', 'VIP_AUTHENTICATION_REQUIRED', 'VIP_CREDENTIAL_RESET_REQUIRED',
      'USER_ID_REQUIRED', 'AUTHENTICATOR_SELECTION_REQUIRED', 'INPUT_REQUIRED', 'ENTRUST_FAILED', 'FRAUD_EVALUATION_CHECK_REQUIRED',
      'AUTHENTICATION_CODE_RESPONSE_REQUIRED', 'BIOMETRIC_DEVICE_AUTHENTICATION_INFO_REQUIRED', 'FIDO2_ACTIVATION_REQUIRED',
    ]
    .concat(oauthUserAuthorizationStates)
    .concat(oneTimeDeviceOtpStates)
    .concat(idVerificationStates);
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

  static get FLOW_TYPE_USER_AUTHZ() {
    return FLOW_TYPE_USER_AUTHZ
  }

  static get FLOW_TYPE_AUTHZ() {
    return FLOW_TYPE_AUTHZ;
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
    this.fraudClientSessionID =  options && options.fraudClientSessionID;
    this.fraudClientPlatform =  options && options.fraudClientPlatform;
    this.fraudClientVersion =  options && options.fraudClientVersion;
    this.registrationFlowConfig = options && options.registrationFlowConfig;
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
    this.postFraudSessionInfoAction = this.postFraudSessionInfoAction.bind(this);
    this.postContinueBiometricDeviceAuthentication = this.postContinueBiometricDeviceAuthentication.bind(this);
    this.registerAgentlessHandler = this.registerAgentlessHandler.bind(this);
    this.handleAgentlessSignOn = this.handleAgentlessSignOn.bind(this);
    this.postEmptyAuthentication = this.postEmptyAuthentication.bind(this);
    this.handleMfaDeviceSelection = this.handleMfaDeviceSelection.bind(this);
    this.handleUpdateDeviceNickName = this.handleUpdateDeviceNickName.bind(this);
    this.handleMfaOneTimeDeviceSelection = this.handleMfaOneTimeDeviceSelection.bind(this);
    this.handleMfaSetDefaultDeviceSelection = this.handleMfaSetDefaultDeviceSelection.bind(this);
    this.displayEditNicknameInput = this.displayEditNicknameInput.bind(this);
    this.closeEditNicknameInput = this.closeEditNicknameInput.bind(this);
    this.updateDeviceNickName = this.updateDeviceNickName.bind(this);
    this.handleMfaRemoveDeviceSelection = this.handleMfaRemoveDeviceSelection.bind(this);
    this.handleAddMfaMethod = this.handleAddMfaMethod.bind(this);
    this.handleCancelAddMfaMethod = this.handleCancelAddMfaMethod.bind(this);
    this.handleCancelRemoveDevice = this.handleCancelRemoveDevice.bind(this);
    this.handleContinueAddMfaMethod = this.handleContinueAddMfaMethod.bind(this);
    this.handleContinueRemoveDevice = this.handleContinueRemoveDevice.bind(this);
    this.registerMfaEventHandler = this.registerMfaEventHandler.bind(this);
    this.registerMfaOneTimeDeviceChangeEventHandler = this.registerMfaOneTimeDeviceChangeEventHandler.bind(this);
    this.registerMfaChangeDeviceEventHandler = this.registerMfaChangeDeviceEventHandler.bind(this);
    this.handleMfaDeviceChange = this.handleMfaDeviceChange.bind(this);
    this.handleMfaOneTimeDeviceChange = this.handleMfaOneTimeDeviceChange.bind(this);
    this.registerMfaUsePasscodeEventHandler = this.registerMfaUsePasscodeEventHandler.bind(this);
    this.handleMfaUsePasscode = this.handleMfaUsePasscode.bind(this);
    this.postPushNotificationWait = this.postPushNotificationWait.bind(this);
    this.registerIdVerificationRequiredEventHandler = this.registerIdVerificationRequiredEventHandler.bind(this);
    this.postIdVerificationRequired = this.postIdVerificationRequired.bind(this);
    this.handleIdVerificationInProgress = this.handleIdVerificationInProgress.bind(this);
    this.handleIdVerificationDevice = this.handleIdVerificationDevice.bind(this);
    this.deviceAuthentication = this.deviceAuthentication.bind(this);
    this.handleIdVerificationOptions = this.handleIdVerificationOptions.bind(this);
    this.optionsAuthentication = this.optionsAuthentication.bind(this);
    this.handleRetryVerification = this.handleRetryVerification.bind(this);
    this.handleCancelAuthentication = this.handleCancelAuthentication.bind(this);
    this.postIdVerificationTimedOut = this.postIdVerificationTimedOut.bind(this);
    this.checkSecurIdPinReset = this.checkSecurIdPinReset.bind(this);
    this.postAssertionRequired = this.postAssertionRequired.bind(this);
    this.postTOTPActivationRequired = this.postTOTPActivationRequired.bind(this);
    this.postOTPRequired = this.postOTPRequired.bind(this);
    this.postAuthenticationCodeResponseRequired = this.postAuthenticationCodeResponseRequired.bind(this);
    this.postPlatformDeviceActivationRequired = this.postPlatformDeviceActivationRequired.bind(this);
    this.postSecurityKeyDeviceActivationRequired = this.postSecurityKeyDeviceActivationRequired.bind(this);
    this.postFido2ActivationRequired = this.postFido2ActivationRequired.bind(this);
    this.postDeviceSelectionRequired = this.postDeviceSelectionRequired.bind(this);
    this.postRegistrationRequired = this.postRegistrationRequired.bind(this);
    this.manageDeviceManagementPopup = this.manageDeviceManagementPopup.bind(this);
    this.pollCheckGet = this.pollCheckGet.bind(this);
    this.postEmailVerificationRequired = this.postEmailVerificationRequired.bind(this);
    this.registerMfaDevicePairingEventHandler = this.registerMfaDevicePairingEventHandler.bind(this);
    this.handleMfaDevicePairingSelection = this.handleMfaDevicePairingSelection.bind(this);
    this.postMobileActivationRequired = this.postMobileActivationRequired.bind(this);
    this.pollMobileActivationState = this.pollMobileActivationState.bind(this);
    this.registerVIPAuthHandler = this.registerVIPAuthHandler.bind(this);
    this.vipAuthHandler = this.vipAuthHandler.bind(this);
    this.registerAuthenticationRequiredHandler = this.registerAuthenticationRequiredHandler.bind(this);
    this.selectAuthenticatorHandler = this.selectAuthenticatorHandler.bind(this);
    this.postInputRequired = this.postInputRequired.bind(this);
    this.registerInputRequiredHandler = this.registerInputRequiredHandler.bind(this);
    this.checkInputHandler = this.checkInputHandler.bind(this);
    this.stateTemplates = new Map();  //state -> handlebar templates
    this.eventHandler = new Map();  //state -> eventHandlers
    this.postRenderCallbacks = new Map();
    this.actionModels = new Map();
    this.store = new Store(flowId, baseUrl, checkRecaptcha, options);
    this.store.registerListener(this.render);
    AuthnWidget.CORE_STATES.forEach(state => this.registerState(state), this);

    this.addEventHandler('IDENTIFIER_REQUIRED', this.registerIdFirstLinks);
    this.addEventHandler('USERNAME_PASSWORD_REQUIRED', this.registerAltAuthSourceLinks);
    this.addEventHandler('REGISTRATION_REQUIRED', this.registerRegistrationLinks);
    this.addEventHandler('REGISTRATION_REQUIRED', this.registerAltAuthSourceLinks);
    this.addPostRenderCallback('REGISTRATION_REQUIRED', this.postRegistrationRequired);
    this.addEventHandler('EXTERNAL_AUTHENTICATION_COMPLETED', this.postContinueAuthentication);
    this.addEventHandler('EXTERNAL_AUTHENTICATION_REQUIRED', this.registerReopenPopUpHandler);
    this.addPostRenderCallback('RESUME', this.resumeToPf);
    this.addPostRenderCallback('EXTERNAL_AUTHENTICATION_REQUIRED', this.openExternalAuthnPopup);
    this.addPostRenderCallback('EXTERNAL_AUTHENTICATION_FAILED', this.externalAuthnFailure);
    this.addEventHandler('DEVICE_PROFILE_REQUIRED', this.postDeviceProfileAction);
    this.addEventHandler('FRAUD_EVALUATION_CHECK_REQUIRED', this.postFraudSessionInfoAction);
    this.addPostRenderCallback('BIOMETRIC_DEVICE_AUTHENTICATION_INFO_REQUIRED', this.postContinueBiometricDeviceAuthentication);
    this.addEventHandler('REFERENCE_ID_REQUIRED', this.registerAgentlessHandler);
    this.addPostRenderCallback('AUTHENTICATION_REQUIRED', this.postEmptyAuthentication);
    this.addPostRenderCallback('MFA_COMPLETED', this.postContinueAuthentication);
    this.addEventHandler('DEVICE_SELECTION_REQUIRED', this.registerMfaEventHandler);
    this.addPostRenderCallback('DEVICE_SELECTION_REQUIRED', this.postDeviceSelectionRequired);
    this.addEventHandler('ONE_TIME_DEVICE_OTP_METHOD_TYPE_INPUT_REQUIRED', this.registerMfaEventHandler);
    this.addEventHandler('ONE_TIME_DEVICE_OTP_INPUT_REQUIRED', this.registerMfaOneTimeDeviceChangeEventHandler);
    this.addEventHandler('OTP_REQUIRED', this.registerMfaEventHandler);
    this.addEventHandler('OTP_REQUIRED', this.registerMfaChangeDeviceEventHandler);
    this.addPostRenderCallback('OTP_REQUIRED', this.postOTPRequired);
    this.addEventHandler('ASSERTION_REQUIRED', this.registerMfaEventHandler);
    this.addEventHandler('ASSERTION_REQUIRED', this.registerMfaChangeDeviceEventHandler);
    this.addPostRenderCallback('ASSERTION_REQUIRED', this.postAssertionRequired);
    this.addPostRenderCallback('AUTHENTICATION_CODE_RESPONSE_REQUIRED', this.postAuthenticationCodeResponseRequired);
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
    this.addPostRenderCallback('ID_VERIFICATION_TIMED_OUT', this.postIdVerificationTimedOut);
    this.addEventHandler('ID_VERIFICATION_DEVICE', this.handleIdVerificationDevice);
    this.addEventHandler('ID_VERIFICATION_OPTIONS', this.handleIdVerificationOptions);
    this.addEventHandler('SECURID_USER_PIN_RESET_REQUIRED', this.checkSecurIdPinReset);
    this.addPostRenderCallback('EMAIL_VERIFICATION_REQUIRED', this.postEmailVerificationRequired);
    this.addPostRenderCallback('TOTP_ACTIVATION_REQUIRED', this.postTOTPActivationRequired);
    this.addPostRenderCallback('PLATFORM_ACTIVATION_REQUIRED', this.postPlatformDeviceActivationRequired);
    this.addPostRenderCallback('SECURITY_KEY_ACTIVATION_REQUIRED', this.postSecurityKeyDeviceActivationRequired);
    this.addPostRenderCallback('FIDO2_ACTIVATION_REQUIRED', this.postFido2ActivationRequired);
    this.addEventHandler('DEVICE_PAIRING_METHOD_REQUIRED', this.registerMfaDevicePairingEventHandler);
    this.addPostRenderCallback('MOBILE_ACTIVATION_REQUIRED', this.postMobileActivationRequired);
    this.addEventHandler('VIP_AUTHENTICATION_REQUIRED', this.registerVIPAuthHandler);
    this.addEventHandler('AUTHENTICATOR_SELECTION_REQUIRED', this.registerAuthenticationRequiredHandler);
    this.addPostRenderCallback('INPUT_REQUIRED', this.postInputRequired);
    this.addEventHandler('INPUT_REQUIRED', this.registerInputRequiredHandler);

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
    this.actionModels.set('submitEmailTarget', {required: ['email']});
    this.actionModels.set('activateEmailDevice', {required: ['otp']});
    this.actionModels.set('submitSmsTarget', {required: ['phone']});
    this.actionModels.set('activateSmsDevice', {required: ['otp']});
    this.actionModels.set('submitVoiceTarget', {required: ['phone']});
    this.actionModels.set('activateVoiceDevice', {required: ['otp']});
    this.actionModels.set('activateTotpDevice', {required: ['otp']});
    this.actionModels.set('activatePlatformDevice', {required: ['origin', 'attestation']});
    this.actionModels.set('activateSecurityKeyDevice', {required: ['origin', 'attestation']});
    this.actionModels.set('activateFido2Device', {required: ['origin', 'attestation']});
    this.actionModels.set('submitVIPCredential', {required: ['vipCredentialId', 'securityCode']});
    this.actionModels.set('resetVIPCredential', {required: ['vipCredentialId', 'securityCode', 'nextSecurityCode']});
    this.actionModels.set('checkUserId', {required: ['userid']});
    this.actionModels.set('selectAuthenticator', {required: ['authenticator']});
    this.actionModels.set('checkInput', {required: ['input']});
    this.actionModels.set('submitFraudSessionInfo', { required: ['sessionId', 'clientPlatform', 'clientAction'] });
    this.actionModels.set('continueBiometricDeviceAuthentication', { required: ['origin'] });
    this.actionModels.set('submitUserCode', { required: ['userCode'] })
    this.actionModels.set('confirmUserCode', { required: ['userCode'] })
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
      this.addPostRenderCallback('FAILED', (state) => failedStateCallback(state, configuration));
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

    let nodes = document.querySelectorAll(`#${this.divId} input[type=text], input[type=password],
    input[type=email], input[type=tel]`);
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
    var errorMessage = document.getElementById('errorMessage');
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
    let rpId = window.location.hostname;
    let userAgent = window.navigator.userAgent;
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
      if (devicePairingMethod[0] === 'SECURITY_KEY' || devicePairingMethod[0] === 'PLATFORM' || devicePairingMethod[0] === 'FIDO2' ) {
        data['devicePairingMethod']['relyingPartyId'] = rpId;
        data['devicePairingMethod']['userAgent'] =  userAgent;
      }
      this.store.dispatch('POST_FLOW', "selectDevicePairingMethod", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  async postMobileActivationRequired() {
    let data = this.store.getStore();
    let QRCode = require('qrcode');
    QRCode.toCanvas(document.getElementById('qrcode'), data.pairingKey, error => {
      if (error) {
        document.getElementById("pairing-message").innerText =
          `Enter the pairing key using ${data.applicationName} to finish pairing.`;
        console.error(error);
      }
    });
    await this.pollMobileActivationState();
  }

  async pollMobileActivationState() {
    let pollState = await this.store.getState();
    if (pollState.status === 'MOBILE_ACTIVATION_REQUIRED') {
      // continue waiting
      clearTimeout(this.pollMobileActivationStateHandler);
      this.pollMobileActivationStateHandler = setTimeout(() => {
        this.pollMobileActivationState();
      }, 1000);
    } else {
      clearTimeout(this.pollMobileActivationStateHandler);
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
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

  postTOTPActivationRequired() {
    let data = this.store.getStore();
    let QRCode = require('qrcode');
    QRCode.toCanvas(document.getElementById('qrcode'), data.keyUri, { 'width': 128, 'height': 128 },
      function (error) {
        if (error) {
          document.getElementById("pairing-message").innerText =
          `Enter the pairing key using your authenticator app,  then enter the code displayed to finish.`;
          console.error(error);
        }
      });
  }

  postOTPRequired() {
    let data = this.store.getStore();
    if (data.changeDevicePermitted === false) {
      document.querySelector('#changeDevice').style.display = 'none';
    }
  }

  async postAuthenticationCodeResponseRequired()
  {
    let data = this.store.getStore();
    let QRCode = require('qrcode');
    QRCode.toCanvas(document.getElementById('qrcode'), data.uri, { 'width': 128, 'height': 128 },
      function (error) {
        if (error) {
          document.getElementById("scan-message").innerText =
          `Scan the code displayed to finish authentication.`;
          console.error(error);
        }
      });
    let pollState = await this.store.getState();
    if (pollState.status === 'AUTHENTICATION_CODE_RESPONSE_REQUIRED') {
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

  postPlatformDeviceActivationRequired() {
    let data = this.store.getStore();
    getCompatibility().then(value => {
      // PLATFORM - FULL
      if (value !== 'FULL') {
        console.log("No acceptable authenticator");
        document.querySelector('#platform_icon_container_id').style.display = 'none';
        document.querySelector('#attestationRequiredId').style.display = 'none';
        document.querySelector('#unsupportedDeviceId').style.display = 'block';
        document.querySelector('#consentRefusedId').style.display = 'none';
      }
      else {
        doRegisterWebAuthn(this, data.status);
      }
    });
  }

  postSecurityKeyDeviceActivationRequired() {
    let data = this.store.getStore();
    getCompatibility().then(value => {
      if (value === 'NONE') {
        console.log("No acceptable authenticator");
        document.querySelector('#security_key_icon_container_id').style.display = 'none';
        document.querySelector('#attestationRequiredId').style.display = 'none';
        document.querySelector('#unsupportedDeviceId').style.display = 'block';
        document.querySelector('#consentRefusedId').style.display = 'none';
      }
      else {
        doRegisterWebAuthn(this, data.status);
      }
    });
  }

  postFido2ActivationRequired() {
    let data = this.store.getStore();
    getCompatibility().then(value => {
      if (value === 'NONE') {
        console.log("No acceptable authenticator");
        document.querySelector('#fido2_icon_container_id').style.display = 'none';
        document.querySelector('#attestationRequiredId').style.display = 'none';
        document.querySelector('#unsupportedDeviceId').style.display = 'block';
        document.querySelector('#consentRefusedId').style.display = 'none';
      }
      else {
        doRegisterWebAuthn(this, data.status);
      }
    });
  }

  postAssertionRequired() {
    let data = this.store.getStore();
    var selectedDevice = data.devices.filter(device => {return device.id === data.selectedDeviceRef.id;});
    if (data.changeDevicePermitted === false) {
      document.querySelector('#changeDevice').style.display = 'none';
    }
    getCompatibility().then(value => {
      // compare value with received, if there is no match, trigger cancel flow
      // PLATFORM - FULL
      // SECURITY_KEY - SECURITY_KEY_ONLY
      // Usernameless flow
      if (selectedDevice === null || selectedDevice.length === 0)
      {
        doWebAuthn(this);
      }
      else if ( ((selectedDevice[0].type === 'SECURITY_KEY' || selectedDevice[0].type ==='FIDO2') && value === 'NONE')
        || (selectedDevice[0].type === 'PLATFORM' && value !== 'FULL') )
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
        } else {
          // Hide spinner and info section, show error so user can go back to device selection if required or cancel
          document.querySelector('#assertionRequiredSpinnerId').style.display = 'none';
          document.querySelector('#assertionRequiredAuthenticatingId').style.display = 'none';
          document.querySelector('#unsupportedDeviceId').style.display = 'block';
          document.querySelector('#deviceInfoBlockId').style.display = 'none';
        }
      } else {
        doWebAuthn(this);
      }
    });
  }

  postRegistrationRequired() {
    this.store.registrationflow = true;
    if(this.registrationFlowConfig && this.registrationFlowConfig.registrationFlowAddTag)
      this.registrationFlowConfig.registrationFlowAddTag();
  }

  postDeviceSelectionRequired() {
    let data = this.store.getStore();
    if (data.manageDevicesAllowed === false) {
      var deviceKebabMenus = document.querySelectorAll('#kebab-menu-icon-id');
      [].forEach.call(deviceKebabMenus, function(deviceKebabMenu) {
        deviceKebabMenu.style.display = "none";
      });
    }

    getCompatibility().then(value => {
      if (value === 'SECURITY_KEY_ONLY') {
        var platformDevices = document.querySelectorAll("[id^='PLATFORM-']");
        [].forEach.call(platformDevices, function(platformDevice) {
          platformDevice.style.display = "none";
        });
      } else if (value === 'NONE') {
        platformDevices = document.querySelectorAll("[id^='PLATFORM-']");
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

  postFraudSessionInfoAction() {
    let clientAction = "login";
    if (this.store.registrationflow === true)
      clientAction = "registration";
    let fraudClientInfo = {
        "sessionId": this.fraudClientSessionID,
        "clientToken": window["_securedTouchToken"],
        "clientAction": clientAction,
        "clientPlatform": this.fraudClientPlatform,
        "clientVersion": this.fraudClientVersion,
      };
    this.store.dispatch('POST_FLOW', 'submitFraudSessionInfo', JSON.stringify(fraudClientInfo));
  }

  postContinueBiometricDeviceAuthentication() {
    let hostName = window.location.hostname;
    let hostInfo = {
        "origin": hostName
      };
    this.store.dispatch('POST_FLOW', 'continueBiometricDeviceAuthentication', JSON.stringify(hostInfo));
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
      case 'PINGONE-PROTECT': {
        if (!this.deviceProfileScript) {
          console.warn('deviceProfileScript is not configured');
          this.store.dispatch('POST_FLOW', 'submitDeviceProfile');
          break;
        }

        script = document.createElement('script');
        script.src = this.deviceProfileScript;
        let dispatched = false;
        const onCompletion = data => {
          if (!dispatched) {
            const deviceProfile = { signalsSdkDeviceProfile: data };
            this.store.dispatch('POST_FLOW', 'submitDeviceProfile', JSON.stringify(deviceProfile));
            dispatched = true;
          }
        }
        script.onload = () => {
          profileDevice(onCompletion);
        }
        document.head.appendChild(script);

        setTimeout(() => {
          if (!dispatched) {
            this.store.dispatch('POST_FLOW', 'submitDeviceProfile');
            dispatched = true;
          }
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
      .forEach(element => element.addEventListener('click', this.manageDeviceManagementPopup));

    Array.from(document.querySelectorAll('[data-mfa-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaDeviceSelection));

    Array.from(document.querySelectorAll('[data-one-time-device-mfa-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaOneTimeDeviceSelection));

    Array.from(document.querySelectorAll("[id^='set-default-device']"))
      .forEach(element => element.addEventListener('click', this.handleMfaSetDefaultDeviceSelection));

    Array.from(document.querySelectorAll("[id^='edit-device']"))
      .forEach(element => element.addEventListener('click', this.displayEditNicknameInput));

    Array.from(document.querySelectorAll("[id^='save_nickname_button']"))
      .forEach(element => element.addEventListener('click', this.handleUpdateDeviceNickName));

    Array.from(document.querySelectorAll("[id^='cancel_edit_name_icon_id']"))
      .forEach(element => element.addEventListener('click', this.closeEditNicknameInput));

    Array.from(document.querySelectorAll("[id^='remove-device']"))
      .forEach(element => element.addEventListener('click', this.handleMfaRemoveDeviceSelection));

    if (document.getElementById('addMfaMethod') !== null) {
      document.getElementById('addMfaMethod')
        .addEventListener('click', this.handleAddMfaMethod);
    }

    if (document.getElementById('addMfaMethodModalBackground') !== null) {
      document.getElementById('addMfaMethodModalBackground')
        .addEventListener('click', this.handleCancelAddMfaMethod);
    }
    if (document.getElementById('cancelAddMfaMethod') !== null) {
      document.getElementById('cancelAddMfaMethod')
        .addEventListener('click', this.handleCancelAddMfaMethod);
    }
    if (document.getElementById('cancelRemoveDevice') !== null) {
      document.getElementById('cancelRemoveDevice')
        .addEventListener('click', this.handleCancelRemoveDevice);
    }
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

  handleMfaOneTimeDeviceSelection(evt) {
    evt.preventDefault();
    let source = evt.currentTarget;
    if (source) {
      let deviceId = source.dataset['oneTimeDeviceMfaSelection'];
      let data = {
        "deviceRef": {
          "id": deviceId
        }
      };
      this.store.dispatch('POST_FLOW', "selectOneTimeDeviceMethod", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  manageDeviceManagementPopup(evt) {
    evt.stopPropagation();
    let source = evt.currentTarget;
    var deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
    var currentElement = 'device-management-popup-frame-' + deviceId;
    // close other popups if any
    var popupDivs = document.querySelectorAll("[id^='device-management-popup-frame']");
    for (var i = 0; i < popupDivs.length; ++i) {
      var popupDisplayStatus = popupDivs[i].style.display;
      if (popupDivs[i] !== document.getElementById(currentElement) && popupDisplayStatus === 'block') {
        popupDivs[i].style.display = 'none';
      }
    }
    popupDisplayStatus = document.getElementById(currentElement).style.display;
    if (popupDisplayStatus === 'block'){
      document.getElementById(currentElement).style.display = 'none';
    }else {
      document.getElementById(currentElement).style.display = 'block';
    }
  }

  handleAddMfaMethod() {
    if (document.querySelector('#authentication_required_block_id') != null) {
      document.querySelector('#authentication_required_block_id').style.display = 'block';
      document.getElementById("auth_required_message").innerText = 'Adding a new authentication method requires to authenticate with an existing method.'
      document.getElementById("auth_required_message").style.display = 'block'
      if (document.getElementById('confirmation_button') !== null) {
        document.getElementById('confirmation_button')
          .addEventListener('click', this.handleContinueAddMfaMethod);
      }
    }
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
  }

  handleContinueAddMfaMethod() {
    this.handleCancelAddMfaMethod();
    this.store.dispatch('POST_FLOW', "setupMfa", null);
  }

  handleContinueRemoveDevice(evt) {
    let source = evt.currentTarget;
    if (source) {
      let deviceId = source.dataset['deviceId'];
      let data = {
        "deviceRef": {
          "id": deviceId
        }
      };
      this.store.dispatch('POST_FLOW', "removeDevice", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    };
  }


  handleCancelAddMfaMethod() {
    if (document.querySelector('#authentication_required_block_id') != null) {
      document.querySelector('#authentication_required_block_id').style.display = 'none';
    }
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
  }

  handleCancelRemoveDevice() {
    if (document.querySelector('#last_device_warning_block_id') != null) {
      document.querySelector('#last_device_warning_block_id').style.display = 'none';
      document.getElementById('confirmation_button').dataset.deviceId = null;
      document.getElementById('confirmation_warn_button').dataset.skip_warn = 'false'
    }
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
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

  displayEditNicknameInput(evt){
    let source = evt.currentTarget;
    let deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
    Array.from(document.querySelectorAll('[data-mfa-selection]')).filter(element => element.dataset['mfaSelection'] === deviceId)
      .forEach(element => element.removeEventListener('click', this.handleMfaDeviceSelection));
    Array.from(document.querySelectorAll('#kebab-menu-icon-id')).filter(element => element.dataset['mfaSelectionKebabMenuContainer'] === deviceId)
      .forEach(element => element.style.display = 'none');
    document.getElementById(deviceId+'_edit_nickname_id').style.display = 'block'
    Array.from(document.querySelectorAll('#cancel_edit_name_icon_id')).filter(element => element.dataset['mfaSelection'] === deviceId)
      .forEach(element => element.style.display = 'block')
    document.getElementById(deviceId+'_device_container').style.display = 'none'
  }

  closeEditNicknameInput(evt){
    evt.stopPropagation();
    let source = evt.currentTarget;
    let deviceId = source.dataset['mfaSelection'];
    Array.from(document.querySelectorAll('#kebab-menu-icon-id')).filter(element => element.dataset['mfaSelectionKebabMenuContainer'] === deviceId)
      .forEach(element => element.style.display = 'block');
    document.getElementById(deviceId+'_edit_nickname_id').style.display = 'none'
    Array.from(document.querySelectorAll('#cancel_edit_name_icon_id')).filter(element => element.dataset['mfaSelection'] === deviceId)
      .forEach(element => element.style.display = 'none')
    document.getElementById(deviceId+'_device_container').style.display = 'block'
    Array.from(document.querySelectorAll('[data-mfa-selection]')).filter(element => element.dataset['mfaSelection'] === deviceId)
      .forEach(element => element.addEventListener('click', this.handleMfaDeviceSelection));
  }

  handleUpdateDeviceNickName(evt) {
    let source = evt.currentTarget;
    let deviceId = source.dataset['mfaSelection'];
    let inputElement = document.getElementById('nickname_input_for_'+deviceId);
    const newNickName = inputElement.value;
    const oldNickName = inputElement.dataset['originName'];
    if (oldNickName === newNickName) {
      this.closeEditNicknameInput(evt);
      return;
    }
    document.getElementById("auth_required_message").innerText = 'Updating device\'s nickname, requires to authenticate with an existing method.'
    document.getElementById("auth_required_message").style.display = 'block'
    document.getElementById("confirmation_button").dataset.deviceId = deviceId;
    document.getElementById("confirmation_button").addEventListener('click', this.updateDeviceNickName)
    document.querySelector('#authentication_required_block_id').style.display = 'block';
  }

  updateDeviceNickName(evt){
    let source = evt.currentTarget;
    let deviceId = source.dataset['deviceId'];
    let newNickname = document.getElementById('nickname_input_for_'+deviceId).value;
    const request = JSON.stringify({id: deviceId, nickname: newNickname});
    this.store.dispatch('POST_FLOW', "updateDeviceNickname", request);
    console.log("INFO - device nickname updated to "+ newNickname);
  }

  handleMfaRemoveDeviceSelection(evt) {
    evt.stopPropagation();
    let source = evt.currentTarget;
    if (document.getElementById('confirmation_button') != null && document.getElementById('confirmation_button').dataset.deviceId == null) {
      if (source) {
      let deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
        document.getElementById('confirmation_button').dataset.deviceId = deviceId;
        document.getElementById('confirmation_button').addEventListener('click', this.handleContinueRemoveDevice)
        document.getElementById('cancelAddMfaMethod').addEventListener('click', this.handleCancelRemoveDevice)
      }else {
        console.log("ERROR - Unable to remove device, as the target was null");
        return;
      }
    }

    let shouldWarn = Array.from(document.querySelectorAll("[id^='remove-device']")).length === 1 && document.getElementById('confirmation_warn_button').dataset.skip_warn !== "true"
    if(shouldWarn && document.querySelector('#last_device_warning_block_id') != null){
      document.querySelector('#last_device_warning_block_id').style.display = 'block';
      document.getElementById('confirmation_warn_button').dataset.skip_warn = "true";
      document.getElementById("confirmation_warn_button").addEventListener('click', this.handleMfaRemoveDeviceSelection)
      return;
    }

    if (document.querySelector('#last_device_warning_block_id') != null) {
      document.querySelector('#last_device_warning_block_id').style.display = 'none';
    }
    if (document.querySelector('#authentication_required_block_id') != null) {
      document.querySelector('#authentication_required_block_id').style.display = 'block';
      document.getElementById("auth_required_message").innerText = 'Removing authentication method requires to authenticate with an existing method.'
      document.getElementById("auth_required_message").style.display = 'block'

    }
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
  }


  registerMfaChangeDeviceEventHandler() {
    document.getElementById('changeDevice')
            .addEventListener('click', this.handleMfaDeviceChange);
  }

  registerMfaOneTimeDeviceChangeEventHandler() {
    document.getElementById('changeOneTimeDevice')
            .addEventListener('click', this.handleMfaOneTimeDeviceChange);
  }

  async handleMfaOneTimeDeviceChange(evt) {
    evt.preventDefault();
    let state = await this.store.getState();
    state.status = 'ONE_TIME_DEVICE_OTP_METHOD_TYPE_INPUT_REQUIRED';
    this.render(this.store.getPreviousStore(), state);
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
    let data = this.store.getStore();
    if (data.changeDevicePermitted === false) {
      document.querySelector('#changeDevice').style.display = 'none';
    }
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
      'div.checkbox__single.required > label > input.required[type=checkbox]:not(:disabled),' +
      'input.required[type=tel]:not(:disabled)');
    let disabled = false;
    if (nodes) {
      nodes.forEach(input => {
        //validate empty + other things
        if (input.value === '' || !input.value.replace(/\s/g, '').length) {
          disabled = true
        }
        if (input.type === 'email') {
          let emailIsValid = input.checkValidity() && isValidEmail(input.value);
          let allowedValue = document.getElementById("allowedValue").getAttribute("data-velocity-variable");
          if (!emailIsValid && allowedValue === "" ) {
            disabled = true;
          }
        }
        if (input.type === 'text' && input.id === 'otp') {
          if (input.value.length !== 6 || !(/^\d+$/.test(input.value))) {
            disabled = true;
          }
        }
        if (input.type === 'checkbox') {
          if (!input.checked) {
            disabled = true;
          }
        }
        if (input.type === 'tel') {
          let phoneIsValid = input.value.length > 0 && input.checkValidity() && isValidPhone(input.value);
          let allowedValue = document.getElementById("allowedValue").getAttribute("data-velocity-variable");
          if (!phoneIsValid && allowedValue === "" ) {
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
    if (document.querySelector('#submit')) {
      document.querySelector('#submit').disabled = disabled;
    }
  }

  async registerIdVerificationRequiredEventHandler() {
    let data = this.store.getStore();

    document.getElementById('qrCode').src = data.qrUrl || "";
    document.getElementById('qrCodeBlock').style.display = 'block';

    document.getElementById('verificationCode').innerHTML = data.verificationCode || "";

    document.getElementById('retryVerification').addEventListener('click', this.handleRetryVerification);

    if (data.newTab && data.webVerificationUrl !== undefined &&
        (this.store.getPreviousStore().verificationCode !== data.verificationCode)) {
      console.log("web link opens newtab: " + data.webVerificationUrl);
      window.open(data.webVerificationUrl, '_blank');
    }
  }

  postIdVerificationRequired() {
    this.pollCheckGet(this.store.getStore().verificationCode, 5000);
  }

  handleIdVerificationInProgress() {
    setTimeout(() => {
      this.store.dispatch('POST_FLOW', 'poll', '{}');
    }, 5000)
  }

  async pollCheckGet(currentVerificationCode, timeout) {
    let fetchUtil = this.store.fetchUtil;
    let result = await fetchUtil.postFlow(this.store.flowId, 'poll', '{}');
    let newState = await result.json();

    if (newState.txStatus === 'INITIATED')
    {
      document.getElementById("requiredHeader").style.display = "none";
      document.getElementById("requiredDescription").style.display = "none";
      document.getElementById("startedHeader").style.display = "block";
      document.getElementById("startedDescription").style.display = "block";
    }
    if (newState.code === 'RESOURCE_NOT_FOUND') {
      console.log("resource not found, stop polling flow");
      return;
    }

    let pollAgain =
      (newState.status === 'ID_VERIFICATION_REQUIRED') &&
      (newState.verificationCode === currentVerificationCode);

    if (!pollAgain) {
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    }
    else {
      this.pollCheckGetHandler = setTimeout(() => {
        this.pollCheckGet(currentVerificationCode, timeout);
      }, timeout);
    }
  }

  async handleRetryVerification(event, cnt) {
    const maxretries = 10;
    if (cnt === undefined) cnt = 1;
    else if (cnt > maxretries) {
      console.log("exceeded max retries, stop sending retry request");
      return;
    }

    clearTimeout(this.pollCheckGetHandler);
    // make cancel button non-clickable after one click
    event.target.style.pointerEvents = "none";

    let actionId = event.target.id;
    let data = this.store;
    data.prevState = data.state;
    // store.reduce is used to prevent notifyListener from being called at the end of store.dispatch
    // when polling is in progress and flow is not available so previous state is returned;
    // don't start extra polling tasks during resubmission of retryVerification request.
    data.state = await this.store.reduce('POST_FLOW', actionId);
    if (data.prevState.username && !data.state.username) {
      data.state.username = data.prevState.username;
    }
    console.log('dispatching retry: ' + actionId+" #"+cnt);
    console.log(data.state);

    if (data.state.status === 'ID_VERIFICATION_REQUIRED') {
      console.log("not returning to first screen, resubmiting post request in 1 second");
      await new Promise(r => setTimeout(r, 1000));
      this.handleRetryVerification(event, cnt+1);
    } else {
      this.store.notifyListeners();
    }
  }

  async handleCancelAuthentication(event) {
    await this.store.dispatch('POST_FLOW', event.target.id);
    const state = this.store.state;
    // cancel in login flow goes to login screen
    // cancel in registration flow renders registration_failed error in a separate page
    if (state.status !== 'USERNAME_PASSWORD_REQUIRED') {
      this.generalErrorRenderer(state.userMessages);
    }
  }

  postIdVerificationTimedOut() {
    document.getElementById('cancelAuthentication').addEventListener('click', this.handleCancelAuthentication);
  }

  handleIdVerificationDevice() {
    document.getElementById('other').addEventListener('click', this.deviceAuthentication);
    document.getElementById('self').addEventListener('click', this.deviceAuthentication);
    document.getElementById('cancelAuthentication').addEventListener('click', this.handleCancelAuthentication);
  }

  deviceAuthentication(event) {
    console.log("selected device: " + event.target.id);
    document.getElementById("AuthnWidgetForm").style.pointerEvents = "none";
    const data = { "deviceAuthentication": event.target.id };
    this.store.dispatch('POST_FLOW', "deviceAuthentication", JSON.stringify(data));
  }

  handleIdVerificationOptions() {
    let data = this.store.getStore();
    if (data.forcePolicy) {
      document.getElementById("description").innerHTML = "Select a method to receive a web link on your mobile device to start the verification process.";
      document.getElementById("qrbtn").style.display = "none";

      const radios = document.getElementsByName("radioGroup");
      for (let i = 0; i < radios.length; i++) {
        radios[i].checked = true;
      }
      document.getElementById("nextbtn").disabled = false;
      document.getElementById("cancelAuthentication").style.display = "block";
      document.getElementById("retryoptions").style.display = "none";
    }
    if (data.errorMessage) {
      document.getElementById("nextbtn").disabled = true;
    } else {
      if (data.emails.length) {
        document.getElementById('emailRadio').addEventListener('click', this.optionsRadioSelected);
      }
      if (data.phones.length) {
        document.getElementById('mobileRadio').addEventListener('click', this.optionsRadioSelected);
      }
      document.getElementById('qrbtn').addEventListener('click', this.optionsAuthentication);
      document.getElementById('nextbtn').addEventListener('click', this.optionsAuthentication);
    }
    document.getElementById('cancelAuthentication').addEventListener('click', this.handleCancelAuthentication);
  }

  optionsRadioSelected() {
    document.getElementById("nextbtn").disabled = false;
  }

  optionsAuthentication(event) {
    console.log("selected option: " + event.target.id);
    document.getElementById("AuthnWidgetForm").style.pointerEvents = "none";
    let email = null;
    let phone = null;
    const qrOnly = event.target.id === "qrbtn";
    if (qrOnly === true) {
      console.log("skip notification, show qr code only");
    } else if (document.querySelector('input[name="radioGroup"]:checked')) {
      const radio = document.querySelector('input[name="radioGroup"]:checked').value;
      if (radio === "emailRadio") {
        const select = document.getElementById("emails");
        email = select.options[select.selectedIndex].value;
        console.log("selected email: "+email);
      } else if (radio === "mobileRadio") {
        const select = document.getElementById("mobiles");
        phone = select.options[select.selectedIndex].value;
        console.log("selected phone: "+phone);
      }
    }
    const data = { "email": email, "phone": phone, "optionsAuthentication": true };
    this.store.dispatch('POST_FLOW', "optionsAuthentication", JSON.stringify(data));
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
    let templateName = currentState;
    let template = this.getTemplate('general_error');
    if (currentState) {
      if (currentState === 'BIOMETRIC_DEVICE_AUTHENTICATION_INFO_REQUIRED'){
        templateName = 'ASSERTION_REQUIRED';
      }
      try {
        template = this.getTemplate(templateName);
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
        "input[type=date]:not(:disabled), input[type=phone]:not(:disabled), input[type=password]:not(:disabled)," +
        "input[type=tel]:not(:disabled)");
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

  registerVIPAuthHandler() {
    const enableRadio = () => document.querySelector('#submit').disabled = false;
    const disableRadio = () => document.querySelector('#submit').disabled = true;
    if (document.getElementById('security-code-radio') !== null) {
      document.getElementById('security-code-radio')
        .addEventListener('click', disableRadio);
    }
    if (document.getElementById('push-radio') !== null) {
      document.getElementById('push-radio')
        .addEventListener('click', enableRadio);
    }
    if (document.getElementById('sms-radio') !== null) {
      document.getElementById('sms-radio')
        .addEventListener('click', enableRadio);
    }
    if (document.getElementById('voice-radio') !== null) {
      document.getElementById('voice-radio')
        .addEventListener('click', enableRadio);
    }
    document.getElementById('submit')
      .addEventListener('click', this.vipAuthHandler);
  }

  vipAuthHandler(evt) {
    evt.preventDefault();
    const vipAuthentication = document.querySelector('input[name="vipAuthentication"]:checked').value;
    if (vipAuthentication === 'push') {
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "initiatePushAuthentication", null);
    } else if (vipAuthentication === 'securityCode') {
      const securityCode = document.getElementById('security-code').value
      const data = { securityCode };
      this.store.dispatch('POST_FLOW', "checkSecurityCode", JSON.stringify(data));
    } else {
      let vipCredentialId;
      if (vipAuthentication === 'sms') {
        vipCredentialId = document.getElementById("sms-list").value;
      } else if (vipAuthentication === 'voice') {
        vipCredentialId = document.getElementById("voice-list").value;
      }
      const data = { vipCredentialId };
      this.store.dispatch('POST_FLOW', "selectVIPCredential", JSON.stringify(data));
    }
  }

  registerAuthenticationRequiredHandler() {
    Array.from(document.querySelectorAll('[data-authenticator-selection]'))
      .forEach(element => element.addEventListener('click', this.selectAuthenticatorHandler), this);
  }

  /**
   * Updates the data submitted for each authenticator button to match the authenticator name.
   *
   * @param evt
   */
  selectAuthenticatorHandler(evt) {
    evt.preventDefault();
    let source = evt.currentTarget;
    if (source) {
      let authenticator = source.dataset['authenticatorSelection'];
      const data = {authenticator};
      this.store.dispatch('POST_FLOW', 'selectAuthenticator', JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch authenticator selection as the target was null");
    }
  }

  /**
   * Hides the passcode field if the authenticator is TOKENPUSH and SMARTCREDENTIALPUSH.
   * @returns {Promise<void>}
   */
  async postInputRequired() {
    let state = await this.store.getState();
    if (state.authenticator === 'TOKENPUSH' || state.authenticator === 'SMARTCREDENTIALPUSH') {
      document.getElementById('passcodefield').style.display = 'none';
      document.querySelector('#submit').disabled = false;
    }
  }

  registerInputRequiredHandler() {
    Array.from(document.querySelectorAll('[data-checkInput]'))
      .forEach(element => element.addEventListener('click', this.checkInputHandler), this);
  }

  /**
   * Handles the different types of data required for the INPUT_REQUIRED use-case for entrust.
   *
   * @param evt
   */
  checkInputHandler(evt) {
      evt.preventDefault();
      let source = evt.currentTarget;
      if (source) {
        let answers = [];
        let data = {};
        // Get the answers from the KBA Answer field
        let answerElements = document.getElementsByName('kbaAnswer');
        for (let i = 0; i < answerElements.length; i++) {
          let answer = {};
          let input = answerElements[i];
          answer.id = input.id;
          answer.answer = input.value;
          answers.push({...answer});
        }
        data.answers = answers;

        // Either the KBA fields are visible or the passcode field is visible
        let inputElement = document.getElementById('passcode');
        if (null !== inputElement) {
          let input = inputElement.value;
          data.input = input;
        }
        this.store.dispatch('POST_FLOW', 'checkInput', JSON.stringify(data));
      }
      else {
        console.log("ERROR - Unable to dispatch authenticator selection as the target was null");
      }
    }
}
