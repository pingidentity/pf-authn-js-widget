import Assets from './utils/assets';
import queryString from 'query-string';
import Handlebars from 'handlebars';
import 'core-js/stable';
import 'formdata-polyfill';
import 'regenerator-runtime/runtime'; //for async await
import 'whatwg-fetch';
import Store from './store';
import redirectlessConfigValidator from './validators/redirectless';
import { getCompatibility, doWebAuthn, doRegisterWebAuthn, type AuthnWidgetLike } from './utils/fidoFlowUtil';
import { completeStateCallback, failedStateCallback, FLOW_TYPE_USER_AUTHZ, FLOW_TYPE_AUTHZ, type RedirectlessConfig } from './utils/redirectless';
import paOnAuthorizationRequest from './utils/paOnAuthorizationRequest';
import paOnAuthorizationSuccess from './utils/paOnAuthorizationSuccess';
import QRCode from 'qrcode';
import './registerHandlebarsHelpers';
import './scss/main.scss';
import { isValidEmail, isValidPhone } from './validators/inputs';
import { isValidFlowId } from './validators/flowId';
import captchaPostRenderCallback from './utils/callbacks/riskPostRenderCallback';
import RiskUtils from './utils/riskUtils';
import type { FlowState, ActionModel, FormDataMap } from './types/state';
import type { RiskAttributes } from './types/risk';
//uncomment to add your personal branding
// import './scss/branding.scss';

const qs = <T extends HTMLElement = HTMLElement>(selector: string, scope: Document | HTMLElement = document): T | null =>
  scope.querySelector<T>(selector);

const qsEl = <T extends HTMLElement = HTMLElement>(selector: string, scope: Document | HTMLElement = document): T =>
  scope.querySelector<T>(selector) as T;

export interface IOptions {
  flowId?: string;
  flowIdMaxLength?: number;
  divId?: string;
  logo?: string;
  useActionParam?: boolean;
  deviceProfileScript?: string;
  fraudClientSessionID?: string;
  fraudClientPlatform?: string;
  fraudClientVersion?: string;
  registrationFlowConfig?: { registrationFlowAddTag?: () => void };
  cookieless?: boolean;
  stateHeaderName?: string;
}

const templateModules = import.meta.glob('./partials/*.hbs', { eager: true, query: '?raw', import: 'default' });
Object.entries(templateModules)
  .forEach(([filePath, templateSource]) => {
    const templateName = filePath.split('/').pop()!.replace('.hbs', '');
    Handlebars.registerPartial(templateName, templateSource as string);
  });

// CustomEvent polyfill for older browsers
(function () {
  if (typeof window.CustomEvent === 'function') return;
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
      'ONE_TIME_DEVICE_OTP_INPUT_REQUIRED',
      'ONE_TIME_DEVICE_OTP_REQUIRED'
    ]

    const idVerificationStates = [
      'ID_VERIFICATION_FAILED',
      'ID_VERIFICATION_REQUIRED',
      'ID_VERIFICATION_TIMED_OUT',
      'ID_VERIFICATION_DEVICE',
      'ID_VERIFICATION_OPTIONS',
    ]

    const magicLinkStates = [
      'LINK_INITIATED',
      'LINK_COMPLETED',
      'LINK_EXPIRED',
    ]

    const securIdStates = [
      'SECURID_NEXT_CODE_REQUIRED',
      'SECURID_TOKEN_REQUIRED',
      'SECURID_CAS_CHALLENGE_METHOD_REQUIRED',
      'SECURID_CAS_APPROVE_METHOD_PENDING_VERIFICATION',
      'SECURID_CREDENTIAL_REQUIRED',
      'SECURID_NEXT_TOKENCODE_REQUIRED',
      'SECURID_REAUTHENTICATION_REQUIRED',
      'SECURID_SYSTEM_PIN_RESET_REQUIRED',
      'SECURID_USER_PIN_RESET_REQUIRED',
    ]

    const credentialVerificationStates = [
      'CREDENTIAL_VERIFICATION_REQUIRED',
      'CREDENTIAL_VERIFICATION_FAILED',
      'CREDENTIAL_VERIFICATION_TIMED_OUT',
    ]

    return ['USERNAME_PASSWORD_REQUIRED', 'MUST_CHANGE_PASSWORD', 'CHANGE_PASSWORD_EXTERNAL', 'NEW_PASSWORD_RECOMMENDED',
      'NEW_PASSWORD_REQUIRED', 'SUCCESSFUL_PASSWORD_CHANGE', 'ACCOUNT_RECOVERY_USERNAME_REQUIRED',
      'ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED', 'RECOVERY_CODE_REQUIRED', 'PASSWORD_RESET_REQUIRED',
      'SUCCESSFUL_PASSWORD_RESET', 'CHALLENGE_RESPONSE_REQUIRED', 'USERNAME_RECOVERY_EMAIL_REQUIRED',
      'USERNAME_RECOVERY_EMAIL_SENT', 'SUCCESSFUL_ACCOUNT_UNLOCK', 'IDENTIFIER_REQUIRED',
      'EXTERNAL_AUTHENTICATION_COMPLETED', 'EXTERNAL_AUTHENTICATION_FAILED', 'EXTERNAL_AUTHENTICATION_REQUIRED',
      'DEVICE_PROFILE_REQUIRED', 'REGISTRATION_REQUIRED', 'REFERENCE_ID_REQUIRED', 'CURRENT_CREDENTIALS_REQUIRED',
      'DEVICE_SELECTION_REQUIRED', 'DEVICE_MANAGEMENT', 'MFA_COMPLETED', 'MFA_FAILED', 'OTP_REQUIRED', 'ASSERTION_REQUIRED',
      'PUSH_CONFIRMATION_REJECTED', 'PUSH_CONFIRMATION_TIMED_OUT', 'PUSH_CONFIRMATION_WAITING', 'ACCOUNT_LINKING_FAILED',
      'EMAIL_VERIFICATION_REQUIRED', 'EMAIL_VERIFICATION_OTP_REQUIRED',
      'MFA_SETUP_REQUIRED', 'DEVICE_PAIRING_METHOD_REQUIRED', 'EMAIL_PAIRING_TARGET_REQUIRED', 'WHATSAPP_PAIRING_TARGET_REQUIRED',
      'EMAIL_ACTIVATION_REQUIRED', 'SMS_PAIRING_TARGET_REQUIRED', 'SMS_ACTIVATION_REQUIRED', 'WHATSAPP_ACTIVATION_REQUIRED',
      'VOICE_PAIRING_TARGET_REQUIRED', 'VOICE_ACTIVATION_REQUIRED', 'TOTP_ACTIVATION_REQUIRED', 'PLATFORM_ACTIVATION_REQUIRED',
      'SECURITY_KEY_ACTIVATION_REQUIRED', 'MOBILE_ACTIVATION_REQUIRED', 'MFA_DEVICE_PAIRING_METHOD_FAILED',
      'VIP_ENROLLMENT', 'VIP_CREDENTIAL_REQUIRED', 'VIP_AUTHENTICATION_REQUIRED', 'VIP_CREDENTIAL_RESET_REQUIRED',
      'USER_ID_REQUIRED', 'AUTHENTICATOR_SELECTION_REQUIRED', 'INPUT_REQUIRED', 'ENTRUST_FAILED', 'FRAUD_EVALUATION_CHECK_REQUIRED',
      'AUTHENTICATION_CODE_RESPONSE_REQUIRED', 'BIOMETRIC_DEVICE_AUTHENTICATION_INFO_REQUIRED', 'FIDO2_ACTIVATION_REQUIRED',
      'UPDATE_NICKNAME', 'OATH_TOKEN_PAIRING_TARGET_REQUIRED', 'OATH_TOKEN_ACTIVATION_REQUIRED'
    ]
      .concat(oauthUserAuthorizationStates)
      .concat(oneTimeDeviceOtpStates)
      .concat(idVerificationStates)
      .concat(magicLinkStates)
      .concat(securIdStates)
      .concat(credentialVerificationStates);
  }

  static get COMMUNICATION_ERROR_MSG() {
    return "Unable to start the authentication flow, please contact your system administrator.";
  }

  static get REDIRECTLESS_REDIRECT_REQUIRED_ERROR_MSG() {
    return "The widget is in redirectless mode and redirect is required to complete authentication.";
  }

  static get FLOW_ID_REQUIRED_MSG() {
    return "'flowId' query parameter is required.";
  }

  static get FLOW_ID_INVALID_MSG() {
    return "'flowId' is invalid. It must contain only alphanumeric characters and not exceed the maximum allowed length.";
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

  // Instance fields
  flowIdMaxLength!: number;
  divId!: string;
  assets!: Assets;
  deviceProfileScript?: string;
  fraudClientSessionID?: string;
  fraudClientPlatform?: string;
  fraudClientVersion?: string;
  registrationFlowConfig?: IOptions['registrationFlowConfig'];
  stateTemplates!: Map<string, Handlebars.TemplateDelegate>;
  eventHandler!: Map<string, Array<() => void>>;
  postRenderCallbacks!: Record<string, Set<(state: FlowState, store?: Store) => void>>;
  actionModels!: Map<string, ActionModel>;
  redirectlessEnabled!: boolean;
  store!: Store;
  // Timeout handles
  emailVerificationRequiredStateTimeout?: ReturnType<typeof setTimeout>;
  pollMobileActivationStateHandler?: ReturnType<typeof setTimeout>;
  pollPushNoticationState?: ReturnType<typeof setTimeout>;
  checkPopupStatusTimeout?: ReturnType<typeof setTimeout>;
  pollCheckGetHandler?: ReturnType<typeof setTimeout>;
  pollCredentialCheckGetHandler?: ReturnType<typeof setTimeout>;

  constructor(baseUrl: string, options?: IOptions) {
    let flowId = (options && options.flowId) || this.getBrowserFlowId();
    this.flowIdMaxLength = (options && options.flowIdMaxLength) || 30;
    this.divId = (options && options.divId) || 'authnwidget';
    if (!baseUrl) {
      throw new Error(AuthnWidget.BASE_URL_REQUIRED_MSG);
    }
    if (flowId && !isValidFlowId(flowId, this.flowIdMaxLength)) {
      throw new Error(AuthnWidget.FLOW_ID_INVALID_MSG);
    }
    this.assets = new Assets(options);
    this.deviceProfileScript = options && options.deviceProfileScript;
    this.fraudClientSessionID = options && options.fraudClientSessionID;
    this.fraudClientPlatform = options && options.fraudClientPlatform;
    this.fraudClientVersion = options && options.fraudClientVersion;
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
    this.postContinue = this.postContinue.bind(this);
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
    this.handleCASChallengeMethodSelection = this.handleCASChallengeMethodSelection.bind(this);
    this.handleMfaOneTimeDeviceSelection = this.handleMfaOneTimeDeviceSelection.bind(this);
    this.handleMfaSetDefaultDeviceSelection = this.handleMfaSetDefaultDeviceSelection.bind(this);
    this.handleMfaRemoveDeviceSelection = this.handleMfaRemoveDeviceSelection.bind(this);
    this.handleAddMfaMethod = this.handleAddMfaMethod.bind(this);
    this.handleCancelAuthRequiredWarning = this.handleCancelAuthRequiredWarning.bind(this);
    this.handleCancelRemoveDevice = this.handleCancelRemoveDevice.bind(this);
    this.handleContinueAddMfaMethod = this.handleContinueAddMfaMethod.bind(this);
    this.handleContinueRemoveDevice = this.handleContinueRemoveDevice.bind(this);
    this.registerMfaEventHandler = this.registerMfaEventHandler.bind(this);
    this.registerSecurIDCASEventHandler = this.registerSecurIDCASEventHandler.bind(this);
    this.registerMfaOneTimeDeviceChangeEventHandler = this.registerMfaOneTimeDeviceChangeEventHandler.bind(this);
    this.registerMfaChangeDeviceEventHandler = this.registerMfaChangeDeviceEventHandler.bind(this);
    this.registerCASChangeMethodEventHandler = this.registerCASChangeMethodEventHandler.bind(this);
    this.handleMfaDeviceChange = this.handleMfaDeviceChange.bind(this);
    this.handleCASUseAlternateMethod = this.handleCASUseAlternateMethod.bind(this);
    this.handleMfaOneTimeDeviceChange = this.handleMfaOneTimeDeviceChange.bind(this);
    this.registerMfaUsePasscodeEventHandler = this.registerMfaUsePasscodeEventHandler.bind(this);
    this.handleMfaUsePasscode = this.handleMfaUsePasscode.bind(this);
    this.postPushNotificationWait = this.postPushNotificationWait.bind(this);
    this.postCASApproveNotificationWait = this.postCASApproveNotificationWait.bind(this);
    this.postCASChallengeMethodRequired = this.postCASChallengeMethodRequired.bind(this);
    this.postCASFlow = this.postCASFlow.bind(this);
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
    this.showDeviceManagementPopup = this.showDeviceManagementPopup.bind(this);
    this.hideDeviceManagementPopup = this.hideDeviceManagementPopup.bind(this);
    this.pollCheckGet = this.pollCheckGet.bind(this);
    this.pollLinkStatus = this.pollLinkStatus.bind(this);
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
    this.registerCredentialVerificationRequiredEventHandler = this.registerCredentialVerificationRequiredEventHandler.bind(this);
    this.postCredentialVerificationRequired = this.postCredentialVerificationRequired.bind(this);
    this.pollCheckGetCredential = this.pollCheckGetCredential.bind(this);
    this.postContinueCredential = this.postContinueCredential.bind(this);
    this.transitionToUpdateDeviceNicknameMode = this.transitionToUpdateDeviceNicknameMode.bind(this);
    this.transitionFromUpdateDeviceNicknameMode = this.transitionFromUpdateDeviceNicknameMode.bind(this);
    this.updateDeviceNickname = this.updateDeviceNickname.bind(this);
    this.displayDeviceMgmt = this.displayDeviceMgmt.bind(this);
    this.usePasswordAuth = this.usePasswordAuth.bind(this);
    this.showDeviceMgmt = this.showDeviceMgmt.bind(this);
    this.handleResumeAuthentication = this.handleResumeAuthentication.bind(this);
    this.transitionToResyncOathTokenMode = this.transitionToResyncOathTokenMode.bind(this);
    this.transitionFromResyncOathTokenMode = this.transitionFromResyncOathTokenMode.bind(this);
    this.resyncOathToken = this.resyncOathToken.bind(this);
    this.registerCountryCodePickerHandler = this.registerCountryCodePickerHandler.bind(this);
    this.registerOneTimeDeviceChangeEventHandler = this.registerOneTimeDeviceChangeEventHandler.bind(this);
    this.handleOneTimeDeviceChange = this.handleOneTimeDeviceChange.bind(this);
    this.stateTemplates = new Map();  //state -> handlebar templates
    this.eventHandler = new Map();  //state -> eventHandlers
    this.postRenderCallbacks = {};
    this.actionModels = new Map();
    this.redirectlessEnabled = false;
    this.store = new Store(flowId, baseUrl, options);
    this.store.registerListener(this.render);
    AuthnWidget.CORE_STATES.forEach(state => this.registerState(state), this);

    this.addEventHandler('IDENTIFIER_REQUIRED', this.registerIdFirstLinks);
    this.addPostRenderCallback('IDENTIFIER_REQUIRED', captchaPostRenderCallback);
    this.addEventHandler('USERNAME_PASSWORD_REQUIRED', this.registerAltAuthSourceLinks);
    this.addPostRenderCallback('USERNAME_PASSWORD_REQUIRED', captchaPostRenderCallback);
    this.addPostRenderCallback('NEW_PASSWORD_REQUIRED', captchaPostRenderCallback);
    this.addPostRenderCallback('ACCOUNT_RECOVERY_USERNAME_REQUIRED', captchaPostRenderCallback);
    this.addPostRenderCallback('USERNAME_RECOVERY_EMAIL_REQUIRED', captchaPostRenderCallback);
    this.addEventHandler('REGISTRATION_REQUIRED', this.registerRegistrationLinks);
    this.addEventHandler('REGISTRATION_REQUIRED', this.registerAltAuthSourceLinks);
    this.addPostRenderCallback('REGISTRATION_REQUIRED', this.postRegistrationRequired);
    this.addPostRenderCallback('REGISTRATION_REQUIRED', captchaPostRenderCallback);
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
    this.addEventHandler('DEVICE_MANAGEMENT', this.registerMfaEventHandler);
    this.addEventHandler('SECURID_CAS_CHALLENGE_METHOD_REQUIRED', this.registerSecurIDCASEventHandler);
    this.addPostRenderCallback('DEVICE_SELECTION_REQUIRED', this.postDeviceSelectionRequired);
    this.addEventHandler('ONE_TIME_DEVICE_OTP_METHOD_TYPE_INPUT_REQUIRED', this.registerMfaEventHandler);
    this.addEventHandler('ONE_TIME_DEVICE_OTP_INPUT_REQUIRED', this.registerMfaOneTimeDeviceChangeEventHandler);
    this.addEventHandler('ONE_TIME_DEVICE_OTP_REQUIRED', this.registerOneTimeDeviceChangeEventHandler);
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
    this.addPostRenderCallback('SECURID_CAS_APPROVE_METHOD_PENDING_VERIFICATION', this.postCASApproveNotificationWait);
    this.addPostRenderCallback('SECURID_NEXT_CODE_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_REAUTHENTICATION_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_NEXT_TOKENCODE_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_SYSTEM_PIN_RESET_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_USER_PIN_RESET_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_CREDENTIAL_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_TOKEN_REQUIRED', this.postCASFlow);
    this.addPostRenderCallback('SECURID_CAS_CHALLENGE_METHOD_REQUIRED', this.postCASChallengeMethodRequired);
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
    this.addPostRenderCallback('LINK_INITIATED', this.pollLinkStatus);
    this.addPostRenderCallback('LINK_COMPLETED', this.postContinue);
    this.addEventHandler('CREDENTIAL_VERIFICATION_REQUIRED', this.registerCredentialVerificationRequiredEventHandler);
    this.addPostRenderCallback('CREDENTIAL_VERIFICATION_REQUIRED', this.postCredentialVerificationRequired);
    this.addPostRenderCallback('CREDENTIAL_VERIFICATION_COMPLETED', this.postContinueCredential);
    this.addEventHandler('SMS_PAIRING_TARGET_REQUIRED', this.registerCountryCodePickerHandler);
    this.addEventHandler('VOICE_PAIRING_TARGET_REQUIRED', this.registerCountryCodePickerHandler);
    this.addEventHandler('WHATSAPP_PAIRING_TARGET_REQUIRED', this.registerCountryCodePickerHandler);

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
    this.actionModels.set('submitIdentifier', { required: ['identifier'], properties: ['identifier', 'captchaResponse'] });
    this.actionModels.set('clearIdentifier', { required: ['identifier'], properties: ['identifier', 'captchaResponse'] });
    this.actionModels.set('registerUser', { required: ['password', 'fieldValues'], properties: ['password', 'captchaResponse', 'fieldValues', 'thisIsMyDevice'] });
    this.actionModels.set('checkOtp', { required: ['otp'] });
    this.actionModels.set('checkAssertion', { required: ['assertion', 'origin', 'compatibility'], properties: ['assertion', 'origin', 'compatibility'] });
    this.actionModels.set('checkCredential', { required: ['passcode'], properties: ['username', 'passcode'] });
    this.actionModels.set('checkNextTokencode', { required: ['tokencode'], properties: ['tokencode'] });
    this.actionModels.set('checkTokencode', { required: ['tokencode'], properties: ['tokencode'] });
    this.actionModels.set('checkPasscode', { required: ['passcode'], properties: ['passcode'] });
    this.actionModels.set('resetPin', { required: ['newPin', 'confirmPin'], properties: ['newPin', 'confirmPin'] });
    this.actionModels.set('validatePasscode', { required: ['passcode'], properties: ['passcode'] });
    this.actionModels.set('submitEmailTarget', { required: ['email'] });
    this.actionModels.set('activateEmailDevice', { required: ['otp'] });
    this.actionModels.set('submitSmsTarget', { required: ['phone'] });
    this.actionModels.set('submitWhatsAppTarget', { required: ['phone'] });
    this.actionModels.set('activateSmsDevice', { required: ['otp'] });
    this.actionModels.set('activateWhatsAppDevice', { required: ['otp'] });
    this.actionModels.set('submitVoiceTarget', { required: ['phone'] });
    this.actionModels.set('activateVoiceDevice', { required: ['otp'] });
    this.actionModels.set('activateTotpDevice', { required: ['otp'] });
    this.actionModels.set('activatePlatformDevice', { required: ['origin', 'attestation'] });
    this.actionModels.set('activateSecurityKeyDevice', { required: ['origin', 'attestation'] });
    this.actionModels.set('activateFido2Device', { required: ['origin', 'attestation'] });
    this.actionModels.set('submitVIPCredential', { required: ['vipCredentialId', 'securityCode'] });
    this.actionModels.set('resetVIPCredential', { required: ['vipCredentialId', 'securityCode', 'nextSecurityCode'] });
    this.actionModels.set('checkUserId', { required: ['userid'] });
    this.actionModels.set('selectAuthenticator', { required: ['authenticator'] });
    this.actionModels.set('checkInput', { required: ['input'] });
    this.actionModels.set('submitFraudSessionInfo', { required: ['sessionId', 'clientPlatform', 'clientAction'] });
    this.actionModels.set('continueBiometricDeviceAuthentication', { required: ['origin'] });
    this.actionModels.set('submitUserCode', { required: ['userCode'] });
    this.actionModels.set('confirmUserCode', { required: ['userCode'] });
    this.actionModels.set('useAlternateMethod', {});
    this.actionModels.set('updateDeviceNickname', { required: ['nickname', 'id'] });
    this.actionModels.set('submitOathTokenTarget', { required: ['serialNumber'] });
    this.actionModels.set('activateOathTokenDevice', { required: ['otp'] });
    this.actionModels.set('resyncOathToken', { required: ['id', 'otp'] });
  }

  init() {
    try {
      if (!this.store.flowId) {
        throw new Error(AuthnWidget.FLOW_ID_REQUIRED_MSG);
      }
      this.renderSpinnerTemplate();
      this.store
        .dispatch('GET_FLOW')
        .catch((err) => {
          console.log(err);
          this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG)
        });
    } catch (err) {
      console.error(err);
      this.generalErrorRenderer((err as Error).message);
    }
  }

  renderSpinnerTemplate() {
    let template = this.getTemplate('initial_spinner');
    let params = this.assets.toTemplateParams();
    let widgetDiv = document.getElementById(this.divId);
    if (widgetDiv) widgetDiv.innerHTML = template(params);
    qsEl('#spinnerId').style.display = 'block';
  }

  initRedirectless(configuration: RedirectlessConfig & { cookieless?: boolean; stateHeaderName?: string }) {
    // input validation
    try {
      console.log(configuration);
      redirectlessConfigValidator(configuration);
      this.redirectlessEnabled = true;
      this.addPostRenderCallback('COMPLETED', (state: FlowState) => completeStateCallback(state, configuration));
      this.addPostRenderCallback('FAILED', (state: FlowState) => failedStateCallback(state, configuration));
      const isCookieless = Boolean(configuration.cookieless);
      this.store.setCookieless(isCookieless);
      if (isCookieless) {
        this.store.setStateHeader(configuration.stateHeaderName || 'X-PF-Authn-API-State');
      }
      this.store
        .dispatch('INIT_REDIRECTLESS', undefined, configuration)
        .catch((err: Error) => this.generalErrorRenderer(err.message));
    } catch (err) {
      this.generalErrorRenderer((err as Error).message);
    }
  }

  generalErrorRenderer(msg?: string) {
    let template = this.getTemplate('general_error');
    let params = this.assets.toTemplateParams() as Record<string, unknown>;
    if (msg) {
      params['msg'] = msg;
    }
    let widgetDiv = document.getElementById(this.divId);
    if (widgetDiv) widgetDiv.innerHTML = template(params);
  }

  defaultEventHandler() {
    Array.from(qsEl(`#${this.divId}`)
      .querySelectorAll("[data-actionId]"))
      .forEach(element => element.addEventListener("click", this.dispatch as EventListener));

    let nodes = document.querySelectorAll(`#${this.divId} input[type=text], input[type=password],
    input[type=email], input[type=tel]`);
    if (nodes) {
      nodes.forEach(n => n.addEventListener('input', this.enableSubmit));
    }

    let dropdowns = document.querySelectorAll<HTMLSelectElement>(`#${this.divId} select`);
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
      this.getForm()!.addEventListener("keydown", (evt: KeyboardEvent) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          let elem = qs("#submit");
          elem && elem.click();
        }
      });
    }
  }

  registerIdFirstLinks() {
    Array.from(document.querySelectorAll('[data-idfirstaction]')).forEach(element => element.addEventListener('click', this.handleIdFirstLinks as EventListener));
  }

  registerRegistrationLinks() {
    Array.from(document.querySelectorAll('[data-registrationactionid]')).forEach(element => element.addEventListener('click', this.handleRegisterUser as EventListener));
    Array.from(document.querySelectorAll("select.required, input[type='date'].required, input.required[type='checkbox']")).forEach(element => element.addEventListener('change', this.enableSubmit));
    Array.from(document.querySelectorAll("input[type='password']")).forEach(element => element.addEventListener('input', this.verifyRegistrationPassword));
  }

  handleIdFirstLinks(evt: MouseEvent) {
    evt.preventDefault();
    let source = (evt.target || evt.srcElement) as HTMLElement;
    let actionId = source.dataset['idfirstaction'];
    let identifier = source.dataset['identifier'];
    let data = {
      identifier
    };
    console.log(actionId + ' : ' + identifier);
    switch (actionId) {
      case 'submitIdentifier':
      case 'clearIdentifier':
        this.dispatchWithCaptcha(actionId, data);
        break;
      case 'selectidentifier':
        qsEl('#existingAccountsSelectionList').style.display = 'none';
        qsEl('#signonidentifier').style.display = 'block';
        break;
    }
  }

  registerAltAuthSourceLinks() {
    Array.from(document.querySelectorAll('[data-altauthsource]')).forEach(element => element.addEventListener('click', this.handleAltAuthSource as EventListener))
  }

  handleAltAuthSource(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
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
    window.location.replace(this.store.getStore().resumeUrl as string);
  }

  openExternalAuthnPopup() {
    if (this.store.getStore().presentationMode === 'REDIRECT') {
      if (this.redirectlessEnabled) {
        this.generalErrorRenderer(AuthnWidget.REDIRECTLESS_REDIRECT_REQUIRED_ERROR_MSG);
        return;
      }
      window.location.replace(this.store.getStore().authenticationUrl as string);
    } else {
      if (document.querySelector("#externalAuthnHeaderId")) {
        (document.querySelector('#externalAuthnHeaderId') as HTMLElement).style.display = 'block';
      }
      if (this.store.getStore().status !== this.store.getPreviousStore().status) {
        let windowReference = window.open(this.store.getStore().authenticationUrl as string | undefined, "_blank", "width=500px,height=500px");
        this.checkPopupStatus(windowReference);
      }
    }
  }

  externalAuthnFailure() {
    if (this.store.getStore().errorUrl) {
      window.location.replace(this.store.getStore().errorUrl as string);
    }
  }

  postContinueAuthentication() {
    if (document.querySelector("#spinnerId")) {
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
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
          (document.querySelector('#notification') as HTMLElement).style.display = 'none';
        }
      }, 5000)
    }
  }

  registerMfaDevicePairingEventHandler() {
    Array.from(document.querySelectorAll('[data-mfa-device-pairing-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaDevicePairingSelection as EventListener));
  }

  handleMfaDevicePairingSelection(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    let rpId = window.location.hostname;
    let userAgent = window.navigator.userAgent;
    if (source) {
      let devicePairingMethod = source.dataset['mfaDevicePairingSelection']!.split('.');
      let data: { devicePairingMethod: Record<string, string> } = {
        'devicePairingMethod': {
          'deviceType': devicePairingMethod[0]
        }
      };
      if (devicePairingMethod.length > 1 && devicePairingMethod[1] !== '') {
        data['devicePairingMethod']['applicationName'] = devicePairingMethod[1];
      }
      if (devicePairingMethod[0] === 'SECURITY_KEY' || devicePairingMethod[0] === 'PLATFORM' || devicePairingMethod[0] === 'FIDO2') {
        data['devicePairingMethod']['relyingPartyId'] = rpId;
        data['devicePairingMethod']['userAgent'] = userAgent;
      }
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "selectDevicePairingMethod", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  async postMobileActivationRequired() {
    let data = this.store.getStore();
    QRCode.toCanvas(document.getElementById('qrcode') as HTMLCanvasElement, data.pairingKey as string, error => {
      if (error) {
        const pairingMsg = document.getElementById("pairing-message");
        if (pairingMsg) pairingMsg.innerText =
          `Enter the pairing key using ${data.applicationName as string} to finish pairing.`;
        console.error(error);
      }
    });
    await this.pollMobileActivationState();
  }

  async pollMobileActivationState() {
    let pollState = await this.store.getState();
    if ((pollState.status as string) === 'MOBILE_ACTIVATION_REQUIRED') {
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
      .forEach(element => element.addEventListener('click', this.handleReopenPopUp as EventListener));
  }

  handleReopenPopUp(evt: MouseEvent) {
    evt.preventDefault();
    let windowReference = window.open(this.store.getStore().authenticationUrl as string | undefined, "_blank", "width=500px,height=500px");
    if (document.querySelector("#spinnerId")) {
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
    }
    if (document.querySelector("#externalAuthnId")) {
      (document.querySelector('#externalAuthnId') as HTMLElement).style.display = 'none';
    }
    clearTimeout(this.checkPopupStatusTimeout)
    this.checkPopupStatus(windowReference);
  }

  postTOTPActivationRequired() {
    let data = this.store.getStore();
    QRCode.toCanvas(document.getElementById('qrcode') as HTMLCanvasElement, data.keyUri as string, { 'width': 128 },
      function (error) {
        if (error) {
          const pairingMsg = document.getElementById("pairing-message");
          if (pairingMsg) pairingMsg.innerText =
            `Enter the pairing key using your authenticator app,  then enter the code displayed to finish.`;
          console.error(error);
        }
      });
  }

  postOTPRequired() {
    let data = this.store.getStore();
    if (data.changeDevicePermitted === false) {
      (document.querySelector('#changeDevice') as HTMLElement).style.display = 'none';
    }
  }

  async postAuthenticationCodeResponseRequired() {
    let data = this.store.getStore();
    QRCode.toCanvas(document.getElementById('qrcode') as HTMLCanvasElement, data.uri as string, { 'width': 128 },
      function (error) {
        if (error) {
          const scanMsg = document.getElementById("scan-message");
          if (scanMsg) scanMsg.innerText =
            `Scan the code displayed to finish authentication.`;
          console.error(error);
        }
      });
    let pollState = await this.store.getState();
    if ((pollState.status as string) === 'AUTHENTICATION_CODE_RESPONSE_REQUIRED') {
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
        (document.querySelector('#platform_icon_container_id') as HTMLElement).style.display = 'none';
        (document.querySelector('#attestationRequiredId') as HTMLElement).style.display = 'none';
        (document.querySelector('#unsupportedDeviceId') as HTMLElement).style.display = 'block';
        (document.querySelector('#consentRefusedId') as HTMLElement).style.display = 'none';
      } else {
        doRegisterWebAuthn(this as unknown as AuthnWidgetLike, data.status as string);
      }
    });
  }

  postSecurityKeyDeviceActivationRequired() {
    let data = this.store.getStore();
    getCompatibility().then(value => {
      if (value === 'NONE') {
        console.log("No acceptable authenticator");
        (document.querySelector('#security_key_icon_container_id') as HTMLElement).style.display = 'none';
        (document.querySelector('#attestationRequiredId') as HTMLElement).style.display = 'none';
        (document.querySelector('#unsupportedDeviceId') as HTMLElement).style.display = 'block';
        (document.querySelector('#consentRefusedId') as HTMLElement).style.display = 'none';
      } else {
        doRegisterWebAuthn(this as unknown as AuthnWidgetLike, data.status as string);
      }
    });
  }

  postFido2ActivationRequired() {
    let data = this.store.getStore();
    getCompatibility().then(value => {
      if (value === 'NONE') {
        console.log("No acceptable authenticator");
        (document.querySelector('#fido2_icon_container_id') as HTMLElement).style.display = 'none';
        (document.querySelector('#attestationRequiredId') as HTMLElement).style.display = 'none';
        (document.querySelector('#unsupportedDeviceId') as HTMLElement).style.display = 'block';
        (document.querySelector('#consentRefusedId') as HTMLElement).style.display = 'none';
      }
      else {
        doRegisterWebAuthn(this as unknown as AuthnWidgetLike, data.status as string);
      }
    });
  }

  postAssertionRequired() {
    let data = this.store.getStore();
    const devices = data.devices as Array<Record<string, unknown>>;
    const selectedDeviceRef = data.selectedDeviceRef as Record<string, unknown>;
    var selectedDevice = devices.filter((device) => { return device.id === selectedDeviceRef.id; });
    if (data.changeDevicePermitted === false) {
      (document.querySelector('#changeDevice') as HTMLElement).style.display = 'none';
    }
    getCompatibility().then(value => {
      // compare value with received, if there is no match, trigger cancel flow
      // PLATFORM - FULL
      // SECURITY_KEY - SECURITY_KEY_ONLY
      // Usernameless flow
      if (selectedDevice === null || selectedDevice.length === 0) {
        doWebAuthn(this as unknown as AuthnWidgetLike);
      } else if (((selectedDevice[0]['type'] === 'SECURITY_KEY' || selectedDevice[0]['type'] === 'FIDO2') && value === 'NONE')
        || (selectedDevice[0]['type'] === 'PLATFORM' && value !== 'FULL')) {
        // Cancel authentication if this is the only device so we don't loop
        console.log("No acceptable authenticator");
        if (devices.length == 1) {
          // Hide back button and all other stuff. Only Cancel is allowed
          (document.querySelector('#assertionRequiredSpinnerId') as HTMLElement).style.display = 'none';
          (document.querySelector('#assertionRequiredAuthenticatingId') as HTMLElement).style.display = 'none';
          (document.querySelector('#unsupportedDeviceId') as HTMLElement).style.display = 'block';
          (document.querySelector('#changeDevice') as HTMLElement).style.display = 'none';
          (document.querySelector('#deviceInfoBlockId') as HTMLElement).style.display = 'none';
        } else {
          // Hide spinner and info section, show error so user can go back to device selection if required or cancel
          (document.querySelector('#assertionRequiredSpinnerId') as HTMLElement).style.display = 'none';
          (document.querySelector('#assertionRequiredAuthenticatingId') as HTMLElement).style.display = 'none';
          (document.querySelector('#unsupportedDeviceId') as HTMLElement).style.display = 'block';
          (document.querySelector('#deviceInfoBlockId') as HTMLElement).style.display = 'none';
        }
      } else {
        doWebAuthn(this as unknown as AuthnWidgetLike);
      }
    });
  }

  postRegistrationRequired() {
    this.store.registrationflow = true;
    if (this.registrationFlowConfig && this.registrationFlowConfig.registrationFlowAddTag)
      this.registrationFlowConfig.registrationFlowAddTag();
  }

  postDeviceSelectionRequired() {
    getCompatibility().then(value => {
      if (value === 'SECURITY_KEY_ONLY') {
        document.querySelectorAll<HTMLElement>("[id^='PLATFORM-']").forEach(platformDevice => {
          platformDevice.style.display = "none";
        });
      } else if (value === 'NONE') {
        document.querySelectorAll<HTMLElement>("[id^='PLATFORM-']").forEach(platformDevice => {
          platformDevice.style.display = "none";
        });

        document.querySelectorAll<HTMLElement>("[id^='SECURITY_KEY-']").forEach(securityKeyDevice => {
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
        script.src = data.deviceProfilingScriptUrl as string;
        document.head.appendChild(script);

        setTimeout(() => {
          this.store.dispatch('POST_FLOW', 'continueAuthentication', '{}');
        }, parseInt(data.deviceProfilingTimeoutMillis as string));
        break;
      case 'TMX-SDK':
        script = document.createElement('script');
        script.src = this.deviceProfileScript!;
        script.onload = function () {
          (window as unknown as Record<string, { run_sid_provided: (...args: unknown[]) => void }>)['pinghelper']
            .run_sid_provided(data.deviceProfilingDomain, data.riskOrgId, data.riskSessionId);
        }
        document.head.appendChild(script);

        setTimeout(() => {
          this.store.dispatch('POST_FLOW', 'continueAuthentication', '{}');
        }, parseInt(data.deviceProfilingTimeoutMillis as string));
        break;
      case 'PINGONE-RISK': {
        script = document.createElement('script');
        script.src = this.deviceProfileScript!;
        const onCompletion = (components: unknown) => {
          const deviceProfile = (window as unknown as Record<string, (c: unknown) => unknown>)['transformComponentsToDeviceProfile'](components);
          this.store.dispatch('POST_FLOW', 'submitDeviceProfile', JSON.stringify(deviceProfile));
        };
        script.onload = () => {
          (window as unknown as Record<string, (cb: (c: unknown) => void) => void>)['profileDevice'](onCompletion);
        }
        document.head.appendChild(script);

        setTimeout(() => {
          this.store.dispatch('POST_FLOW', 'submitDeviceProfile');
        }, parseInt(data.deviceProfilingTimeoutMillis as string));
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
        const onCompletion = (data: unknown) => {
          if (!dispatched) {
            const deviceProfile = { signalsSdkDeviceProfile: data };
            this.store.dispatch('POST_FLOW', 'submitDeviceProfile', JSON.stringify(deviceProfile));
            dispatched = true;
          }
        }
        script.onload = () => {
          (window as unknown as Record<string, (cb: (d: unknown) => void) => void>)['profileDevice'](onCompletion);
        }
        document.head.appendChild(script);

        setTimeout(() => {
          if (!dispatched) {
            this.store.dispatch('POST_FLOW', 'submitDeviceProfile');
            dispatched = true;
          }
        }, parseInt(data.deviceProfilingTimeoutMillis as string));
        break;
      }
    }
  }

  postEmptyAuthentication() {
    if (document.querySelector("#spinnerId")) {
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
    }
    this.store.dispatch('POST_FLOW', 'authenticate', '{}');
  }

  async registerSecurIDCASEventHandler() {
    Array.from(document.querySelectorAll('[data-cas-challenge-method-selection]'))
      .forEach(element => element.addEventListener('click', this.handleCASChallengeMethodSelection as EventListener));
    let state = await this.store.getState();
    if (state.challengeMethodIds !== undefined && state.challengeMethodIds !== null && (state.challengeMethodIds as unknown[]).length >= 1) {
      this.store.securIdChallengeMethods = state.challengeMethodIds as string[];
    } else {
      (state as Record<string, unknown>)['challengeMethodIds'] = this.store.securIdChallengeMethods;
    }
  }

  registerMfaEventHandler() {
    Array.from(document.querySelectorAll('[data-mfa-selection-kebab-menu-container]'))
      .forEach(element => element.addEventListener('click', this.showDeviceManagementPopup as EventListener));

    Array.from(document.querySelectorAll('[data-mfa-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaDeviceSelection as EventListener));

    Array.from(document.querySelectorAll('[data-one-time-device-mfa-selection]'))
      .forEach(element => element.addEventListener('click', this.handleMfaOneTimeDeviceSelection as EventListener));

    document.addEventListener('click', this.hideDeviceManagementPopup as EventListener);

    Array.from(document.querySelectorAll("[id^='set-default-device']"))
      .forEach(element => element.addEventListener('click', this.handleMfaSetDefaultDeviceSelection as EventListener));

    Array.from(document.querySelectorAll("[id^='remove-device']"))
      .forEach(element => element.addEventListener('click', this.handleMfaRemoveDeviceSelection as EventListener));

    Array.from(document.querySelectorAll("[id^='update-device']"))
      .forEach(element => element.addEventListener('click', this.transitionToUpdateDeviceNicknameMode as EventListener));

    Array.from(document.querySelectorAll("[id^='resync-device']"))
      .forEach(element => element.addEventListener('click', this.transitionToResyncOathTokenMode as EventListener));

    if (document.getElementById('addMfaMethod') !== null) {
      document.getElementById('addMfaMethod')!
        .addEventListener('click', this.handleAddMfaMethod);
    }

    if (document.getElementById('addMfaMethodModalBackground') !== null) {
      document.getElementById('addMfaMethodModalBackground')!
        .addEventListener('click', this.handleCancelAuthRequiredWarning);
    }
    if (document.getElementById('cancelAddMfaMethod') !== null) {
      document.getElementById('cancelAddMfaMethod')!
        .addEventListener('click', this.handleCancelAuthRequiredWarning);
    }
    if (document.getElementById('cancelRemoveDevice') !== null) {
      document.getElementById('cancelRemoveDevice')!
        .addEventListener('click', this.handleCancelRemoveDevice);
    }
    if (document.getElementById('manageDevices') !== null) {
      document.getElementById('manageDevices')!
        .addEventListener('click', this.displayDeviceMgmt);
    }
    if (document.getElementById('usePasswordButton') !== null) {
      document.getElementById('usePasswordButton')!
        .addEventListener('click', this.usePasswordAuth);
    }
    if (document.getElementById('continueAuth') !== null) {
      document.getElementById('continueAuth')!
        .addEventListener('click', this.handleResumeAuthentication);
    }
  }

  handleMfaDeviceSelection(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
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

  handleCASChallengeMethodSelection(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    let storeState = this.store.getStore();
    if (source) {
      let casMethod = source.dataset['casChallengeMethodSelection'];
      let data = {
        "input": casMethod
      };
      this.store.dispatch('POST_FLOW', "selectChallengeMethod", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  handleMfaOneTimeDeviceSelection(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
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

  showDeviceManagementPopup(evt: MouseEvent) {
    evt.stopPropagation();
    // close other popups if any
    var popupDivs = document.querySelectorAll<HTMLElement>("[id^='device-management-popup-frame']");
    for (var i = 0; i < popupDivs.length; ++i) {
      var popupDisplayStatus = popupDivs[i].style.display;
      if (popupDisplayStatus === 'block') {
        popupDivs[i].style.display = 'none';
      }
    }
    let source = evt.currentTarget as HTMLElement;
    var deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
    var docId = 'device-management-popup-frame-' + deviceId;
    document.getElementById(docId)!.style.display = 'block';
  }

  hideDeviceManagementPopup(evt: MouseEvent) {
    var target = evt.target;
    var kebabMenuDivs = document.querySelectorAll("[id='kebab-menu-svg-id']");
    for (var i = 0; i < kebabMenuDivs.length; ++i) {
      if (kebabMenuDivs[i] == target) {
        return;
      }
    }

    var popupDivs = document.querySelectorAll<HTMLElement>("[id^='device-management-popup-frame']");
    for (var i = 0; i < popupDivs.length; ++i) {
      var popupDisplayStatus = popupDivs[i].style.display;
      if (popupDisplayStatus === 'block') {
        popupDivs[i].style.display = 'none';
      }
    }
  }

  handleAddMfaMethod() {
    this.renderSpinnerTemplate();
    this.store.dispatch('POST_FLOW', "setupMfa", null);
  }

  handleContinueAddMfaMethod() {
    this.handleCancelAuthRequiredWarning();
    this.store.dispatch('POST_FLOW', "setupMfa", null);
  }

  handleContinueRemoveDevice(evt: MouseEvent) {
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let deviceId = source.dataset['deviceId'];
      let data = {
        "deviceRef": {
          "id": deviceId
        }
      };
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "removeDevice", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    };
  }

  handleCancelAuthRequiredWarning() {
    if (document.querySelector('#authentication_required_block_id') != null) {
      (document.querySelector('#authentication_required_block_id') as HTMLElement).style.display = 'none';
    }
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
  }

  handleCancelRemoveDevice() {
    if (document.querySelector('#last_device_warning_block_id') != null) {
      (document.querySelector('#last_device_warning_block_id') as HTMLElement).style.display = 'none';
      document.getElementById('confirmation_button')!.dataset.deviceId = undefined;
      document.getElementById('confirmation_warn_button')!.dataset.skip_warn = 'false'
    }
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
  }

  handleMfaSetDefaultDeviceSelection(evt: MouseEvent) {
    evt.stopPropagation();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
      let data = {
        "deviceRef": {
          "id": deviceId
        }
      };
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "setDefaultDevice", JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch device selection as the target was null");
    }
  }

  registerCASChangeMethodEventHandler() {
    document.getElementById('useAlternateMethod')!
      .addEventListener('click', this.handleCASUseAlternateMethod);
  }

  async postCASChallengeMethodRequired() {
    let state = await this.store.getState();
  }

  async postCASFlow() {
    if (document.getElementById('useAlternateMethod') != null) {
      document.getElementById('useAlternateMethod')!
        .addEventListener('click', this.handleCASUseAlternateMethod);
      if (this.store.securIdChallengeMethods !== undefined && this.store.securIdChallengeMethods.length >= 1) {
        document.getElementById('useAlternateMethod')!.style.display = 'block';
      }
    }
  }

  async handleCASUseAlternateMethod(evt: MouseEvent) {
    evt.preventDefault();
    if (this.pollPushNoticationState) {
      clearTimeout(this.pollPushNoticationState);
    }
    this.store.dispatch('POST_FLOW', "useAlternateMethod", '{}');
  }

  async postCASApproveNotificationWait() {
    if (document.querySelector("#spinnerId")) {
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
    }
    document.getElementById('useAlternateMethod')!
      .addEventListener('click', this.handleCASUseAlternateMethod);
    let newState = await this.store.poll();
    let pollState = await this.store.getState();
    if ((pollState.status as string) === 'SECURID_CAS_APPROVE_METHOD_PENDING_VERIFICATION') {
      // continue waiting
      clearTimeout(this.pollPushNoticationState);
      this.pollPushNoticationState = setTimeout(() => {
        this.postCASApproveNotificationWait();
      }, 5000);
    } else {
      clearTimeout(this.pollPushNoticationState);
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    }
  }

  handleMfaRemoveDeviceSelection(evt: MouseEvent) {
    evt.stopPropagation();
    let source = evt.currentTarget as HTMLElement;
    if (document.getElementById('confirmation_button') != null && document.getElementById('confirmation_button')!.dataset.deviceId == null) {
      if (source) {
        let deviceId = source.dataset['mfaSelectionKebabMenuContainer'];
        document.getElementById('confirmation_button')!.dataset.deviceId = deviceId;
        document.getElementById('confirmation_button')!.addEventListener('click', this.handleContinueRemoveDevice)
        document.getElementById('cancelAddMfaMethod')!.addEventListener('click', this.handleCancelRemoveDevice)
      } else {
        console.log("ERROR - Unable to remove device, as the target was null");
        return;
      }
    }

    let shouldWarn = Array.from(document.querySelectorAll("[id^='remove-device']")).length === 1 && document.getElementById('confirmation_warn_button')!.dataset.skip_warn !== "true"
    if (shouldWarn && document.querySelector('#last_device_warning_block_id') != null) {
      (document.querySelector('#last_device_warning_block_id') as HTMLElement).style.display = 'block';
      document.getElementById('confirmation_warn_button')!.dataset.skip_warn = "true";
      document.getElementById('confirmation_warn_button')!.dataset.mfaSelectionKebabMenuContainer = source.dataset['mfaSelectionKebabMenuContainer'];
      document.getElementById("confirmation_warn_button")!.addEventListener('click', this.handleMfaRemoveDeviceSelection)
      return;
    }

    if (document.querySelector('#last_device_warning_block_id') != null) {
      (document.querySelector('#last_device_warning_block_id') as HTMLElement).style.display = 'none';
    }
    if (source) {
      console.log("mfaSelectionKebabMenuContainer", source.dataset['mfaSelectionKebabMenuContainer']);
      (evt.currentTarget as HTMLElement).dataset['deviceId'] = source.dataset['mfaSelectionKebabMenuContainer'];
    }
    this.handleContinueRemoveDevice(evt);
  }

  registerMfaChangeDeviceEventHandler() {
    document.getElementById('changeDevice')!
      .addEventListener('click', this.handleMfaDeviceChange);
  }

  registerMfaOneTimeDeviceChangeEventHandler() {
    document.getElementById('changeOneTimeDevice')!
      .addEventListener('click', this.handleMfaOneTimeDeviceChange);
  }

  async handleMfaOneTimeDeviceChange(evt: MouseEvent) {
    evt.preventDefault();
    let state = await this.store.getState();
    (state as Record<string, unknown>)['status'] = 'ONE_TIME_DEVICE_OTP_METHOD_TYPE_INPUT_REQUIRED';
    this.render(this.store.getPreviousStore(), state);
  }

  registerOneTimeDeviceChangeEventHandler() {
    document.getElementById('changeOneTimeDevice')!
      .addEventListener('click', this.handleOneTimeDeviceChange);
  }

  async handleOneTimeDeviceChange(evt: MouseEvent) {
    evt.preventDefault();
    let state = await this.store.getState();
    (state as Record<string, unknown>)['status'] = 'DEVICE_SELECTION_REQUIRED';
    this.render(this.store.getPreviousStore(), state);
  }

  async handleMfaDeviceChange(evt: MouseEvent) {
    evt.preventDefault();
    let state = await this.store.getState();
    if (this.pollPushNoticationState) {
      clearTimeout(this.pollPushNoticationState);
    }
    (state as Record<string, unknown>)['status'] = 'DEVICE_SELECTION_REQUIRED';
    this.render(this.store.getPreviousStore(), state);
  }

  registerMfaUsePasscodeEventHandler() {
    if (document.getElementById('usePasscode')) {
      document.getElementById('usePasscode')!
        .addEventListener('click', this.handleMfaUsePasscode);
    }
  }

  async handleMfaUsePasscode(evt: MouseEvent) {
    evt.preventDefault();
    clearTimeout(this.pollPushNoticationState);
    let storeState = this.store.getStore();
    (storeState as Record<string, unknown>)['status'] = 'OTP_REQUIRED';
    this.render(this.store.getPreviousStore(), storeState);
  }

  async postPushNotificationWait() {
    let storeState = this.store.getStore();
    let data = this.store.getStore();
    if (data.changeDevicePermitted === false) {
      (document.querySelector('#changeDevice') as HTMLElement).style.display = 'none';
    }
    if ((storeState.status as string) === 'OTP_REQUIRED') {
      this.render(this.store.getPreviousStore(), storeState);
      return;
    } else if (storeState.errorCode === 'VALIDATION_ERROR') {
      if (storeState.errorDetailCodes && storeState.errorDetailCodes.includes('INVALID_OTP')) {
        (storeState as Record<string, unknown>)['status'] = 'OTP_REQUIRED';
        this.render(this.store.getPreviousStore(), storeState);
        return;
      }
    }

    if (document.querySelector("#spinnerId")) {
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
    }

    let pollState = await this.store.getState();
    if ((pollState.status as string) === 'PUSH_CONFIRMATION_WAITING') {
      // continue waiting
      clearTimeout(this.pollPushNoticationState);
      this.pollPushNoticationState = setTimeout(() => {
        this.postPushNotificationWait();
      }, 1000);
    } else if ((pollState.status as string) === 'DEVICE_MANAGEMENT') {
      this.render(this.store.getPreviousStore(), pollState);
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
      forEach(element => element.addEventListener('click', this.handleAgentlessSignOn as EventListener));
  }

  handleAgentlessSignOn(evt: MouseEvent) {
    console.log("send credentials to authentication service");
    console.log("complete state `checkReferenceId` action with new REF ID returned");
  }

  verifyPasswordsMatch() {
    let pass1 = qs<HTMLInputElement>('#newpassword');
    let pass2 = qs<HTMLInputElement>('#verifypassword');
    if (pass1?.value !== pass2?.value) {
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
    let nodes = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input.required[type=text]:not(:disabled), ' +
      'input.required[type=password]:not(:disabled), input.required[type=email]:not(:disabled), ' +
      'select.required:not(:disabled), input.required[type=date]:not(:disabled), ' +
      'div.checkbox__single.required > label > input.required[type=checkbox]:not(:disabled),' +
      'input.required[type=tel]:not(:disabled)');
    let disabled = false;
    if (nodes) {
      nodes.forEach(input => {
        const inp = input as HTMLInputElement;
        //validate empty + other things
        if (inp.value === '' || !inp.value.replace(/\s/g, '').length) {
          disabled = true
        }
        if (inp.type === 'email') {
          let emailIsValid = inp.checkValidity() && isValidEmail(inp.value);
          if (!emailIsValid) {
            disabled = true;
          }
        }
        if (inp.type === 'text' && inp.id === 'otp') {
          const tooShortOrTooLong = (inp.value.length < 6 || inp.value.length > inp.maxLength);
          const isNumeric = /^\d+$/.test(inp.value);

          if (tooShortOrTooLong || !isNumeric) {
            disabled = true;
          }
        }
        if (inp.type === 'checkbox') {
          if (!inp.checked) {
            disabled = true;
          }
        }
        if (inp.type === 'tel') {
          let phoneIsValid = inp.value.length > 0 && inp.checkValidity() && isValidPhone(inp.value);
          if (!phoneIsValid) {
            disabled = true;
          }
        }
      });
    }
    let checkboxGroups = document.querySelectorAll("div.required.checkbox__group")
    if (checkboxGroups) {
      checkboxGroups.forEach(checkboxes => {
        let oneChecked = false;
        let inputs = checkboxes.querySelectorAll<HTMLInputElement>("input:not(:disabled)")
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
    if (document.querySelector('#submit') != null) {
      (document.querySelector('#submit') as HTMLButtonElement).disabled = disabled;
    }
  }

  async registerIdVerificationRequiredEventHandler() {
    let data = this.store.getStore();

    (document.getElementById('qrCode') as HTMLImageElement).src = (data.qrUrl as string) || "";
    document.getElementById('qrCodeBlock')!.style.display = 'block';

    document.getElementById('verificationCode')!.innerHTML = (data.verificationCode as string) || "";

    document.getElementById('retryVerification')!.addEventListener('click', this.handleRetryVerification as unknown as EventListener);
    document.getElementById('qrbtn')!.addEventListener('click', this.displayQR);

    if (data.sameDevice && data.webVerificationUrl !== undefined &&
        (this.store.getPreviousStore().verificationCode !== data.verificationCode)) {
      // avoid splash qr screen before redirected to webverify
      document.body.hidden = true;
      // open weblink in current tab on same device, with autoRedirectToPF & skipIntroScreen
      (data as Record<string, unknown>)['webVerificationUrl'] = (data.webVerificationUrl as string) + '&skipIntro=1&dt=1';
      console.log("web link opens in same device: " + data.webVerificationUrl);
      window.open(data.webVerificationUrl as string, '_self');
    }

    if (data.notificationMethod) {
      // weblink was sent successfully, show notification sent screen instead of qrcode
      document.getElementById("linkSent")!.style.display = "block";
      document.getElementById("verificationData")!.style.display = "none";
    }
  }

  displayQR() {
    document.getElementById("linkSent")!.style.display = "none";
    document.getElementById("verificationData")!.style.display = "block";
  }

  postIdVerificationRequired() {
    this.pollCheckGet(this.store.getStore().verificationCode as string, 5000);
  }

  postContinue() {
    this.store.dispatch('POST_FLOW', 'continue', '{}')
      .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
  }

  pollLinkStatus() {
    this.pollLink(2000);
  }

  async pollLink(timeout: number) {
    let newState = await this.store.poll();

    if ((newState.status as string) === 'LINK_INITIATED') {
      setTimeout(() => {
        this.pollLink(timeout);
      }, timeout);
    } else if ((newState.status as string) === 'LINK_EXPIRED' || (newState.status as string) === 'LINK_COMPLETED') { // Render the new template
      this.store.dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    } else {
      // The flow continued and the original tab won't be able to get a magic link status.
      let template = this.getTemplate('link_done');
      let params = this.assets.toTemplateParams();
      let widgetDiv = document.getElementById(this.divId);
      if (widgetDiv) widgetDiv.innerHTML = template(params);
    }
  }

  handleIdVerificationInProgress() {
    setTimeout(() => {
      this.store.dispatch('POST_FLOW', 'poll', '{}');
    }, 5000)
  }

  async pollCheckGet(currentVerificationCode: string, timeout: number) {
    let newState = await this.store.poll();

    if (Object.prototype.hasOwnProperty.call(newState, 'errJson')) {
      // failed retry message is shown on qr screen
      this.displayQR();
    }
    if (newState.txStatus === 'INITIATED') {
      document.getElementById("requiredHeader")!.style.display = "none";
      document.getElementById("requiredDescription")!.style.display = "none";
      document.getElementById("startedHeader")!.style.display = "block";
      document.getElementById("startedDescription")!.style.display = "block";
    }
    if (newState.code === 'RESOURCE_NOT_FOUND') {
      console.log("resource not found, stop polling flow");
      return;
    }

    let pollAgain =
      ((newState.status as string) === 'ID_VERIFICATION_REQUIRED') &&
      (newState.verificationCode === currentVerificationCode);

    if (!pollAgain) {
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    } else {
      this.pollCheckGetHandler = setTimeout(() => {
        this.pollCheckGet(currentVerificationCode, timeout);
      }, timeout);
    }
  }

  async handleRetryVerification(event: MouseEvent & { target: HTMLElement }, cnt?: number) {
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
    console.log('dispatching retry: ' + actionId + " #" + cnt);
    console.log(data.state);

    if ((data.state.status as string) === 'ID_VERIFICATION_REQUIRED') {
      console.log("not returning to first screen, resubmiting post request in 1 second");
      await new Promise(r => setTimeout(r, 1000));
      this.handleRetryVerification(event, cnt + 1);
    } else {
      this.store.notifyListeners();
    }
  }

  async handleCancelAuthentication(event: MouseEvent & { target: HTMLElement }) {
    await this.store.dispatch('POST_FLOW', event.target.id);
    const state = this.store.state;
    // cancel in login flow goes to login screen
    // cancel in registration flow renders registration_failed error in a separate page
    if ((state.status as string) !== 'USERNAME_PASSWORD_REQUIRED') {
      this.generalErrorRenderer(JSON.stringify(state.userMessages));
    }
  }

  postIdVerificationTimedOut() {
    document.getElementById('cancelAuthentication')!.addEventListener('click', this.handleCancelAuthentication as unknown as EventListener);
  }

  handleIdVerificationDevice() {
    document.getElementById('beginbtn')!.addEventListener('click', this.deviceAuthentication);
    document.getElementById('cancelAuthentication')!.addEventListener('click', this.handleCancelAuthentication as unknown as EventListener);
  }

  deviceAuthentication() {
    let dataStore = this.store.getStore();
    document.getElementById("AuthnWidgetForm")!.style.pointerEvents = "none";

    // javascript from http://detectmobilebrowser.com/
    const isMobile = (function(a: string){return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4));})(navigator.userAgent||navigator.vendor||(window as unknown as Record<string, string>)['opera']);
    const device = (isMobile || dataStore.desktopAutoRedirect) ? "self" : "other";
    const data = { "deviceAuthentication": device };
    this.store.dispatch('POST_FLOW', "deviceAuthentication", JSON.stringify(data));
  }

  handleIdVerificationOptions() {
    let data = this.store.getStore();
    if (data.forcePolicy) {
      document.getElementById("description")!.innerHTML = "Select a method to receive a web link on your mobile device to start the verification process.";
      document.getElementById("qrbtn")!.style.display = "none";
      document.getElementById("or")!.style.display = "none";

      document.getElementById("cancelAuthentication")!.style.display = "block";
      document.getElementById("retryoptions")!.style.display = "none";
    }
    if (!data.errorMessage) {
      const tiles = document.querySelectorAll('.tile-button');
      tiles.forEach(tile => {
        tile.addEventListener('click', function () {
          tiles.forEach(otherTile => {
            if (otherTile !== tile && otherTile.classList.contains('tile-button--selected')) {
              otherTile.classList.remove('tile-button--selected');
            }
          });
          tile.classList.toggle('tile-button--selected');
        });
      });

      const emails = document.getElementsByName("email") as NodeListOf<HTMLInputElement>;
      const phones = document.getElementsByName("phone") as NodeListOf<HTMLInputElement>;
      if (emails?.length > 0) {
        emails[0].checked = true;
      }
      if (phones?.length > 0) {
        phones[0].checked = true;
      }

      Array.from(document.querySelectorAll('[data-method]'))
        .forEach(element => element.addEventListener('click', this.notificationMethodSelected as EventListener));
      document.getElementById('nextbtn')!.addEventListener('click', this.optionsAuthentication);
    }
    document.getElementById('cancelAuthentication')!.addEventListener('click', this.handleCancelAuthentication as unknown as EventListener);
  }

  notificationMethodSelected(evt: MouseEvent) {
    (document.getElementById("nextbtn") as HTMLButtonElement).disabled = false;

    evt.preventDefault();
    const source = evt.currentTarget as HTMLElement;
    if (source) {
      const method = source.dataset['method'];

      const emailOptions = document.getElementById("emailOptions");
      const phoneOptions = document.getElementById("phoneOptions");
      if (emailOptions) {
        emailOptions.style.display = "none";
      }
      if (phoneOptions) {
        phoneOptions.style.display = "none";
      }
      if (method === 'email') {
        emailOptions!.style.display = "block";
      } else if (method === 'phone') {
        phoneOptions!.style.display = "block";
      }
    } else {
      console.log("ERROR - Unable to dispatch notification method selection as the target was null");
    }
  }

  optionsAuthentication() {
    document.getElementById("AuthnWidgetForm")!.style.pointerEvents = "none";
    let email: string | null = null;
    let phone: string | null = null;
    const emailNotification = document.getElementById("emailOptions")?.style.display === "block";
    const phoneNotification = document.getElementById("phoneOptions")?.style.display === "block";
    if (emailNotification) {
      email = qs<HTMLInputElement>('input[name="email"]:checked')?.value ?? null;
    } else if (phoneNotification) {
      phone = qs<HTMLInputElement>('input[name="phone"]:checked')?.value ?? null;
    }
    const data = { "email": email, "phone": phone, "optionsAuthentication": true };
    this.store.dispatch('POST_FLOW', "optionsAuthentication", JSON.stringify(data));
  }

  checkSecurIdPinReset() {
    Array.from(document.querySelectorAll("input[type='password']")).forEach(element => element.addEventListener('input', this.checkPinMatch));
  }

  checkPinMatch() {
    var status = document.getElementById('pinStatus')!;
    var errorMessage = document.getElementById('errorMessage')!;
    var pin = (document.getElementById("newPin") as HTMLInputElement).value;
    var confirmPin = (document.getElementById("confirmPin") as HTMLInputElement).value;

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
      (document.querySelector('#submit') as HTMLButtonElement).disabled = true;
    }
  }

  async registerCredentialVerificationRequiredEventHandler() {
    let data = this.store.getStore();

    (document.getElementById('qrCode') as HTMLImageElement).src = (data.qrUrl as string) || "";
    document.getElementById('appOpenUrl')!.addEventListener('click', this.handleAppOpenUrl(data.appOpenUrl));

    if (data.redirect && data.appOpenUrl !== undefined &&
      (this.store.getPreviousStore() as Record<string, unknown>)['appOpenUrl'] != data.appOpenUrl) {
      console.log("redirect to " + data.appOpenUrl);
      window.open(data.appOpenUrl as string, "_blank");
    }
  }

  handleAppOpenUrl(appOpenUrl: unknown) {
    return (evt: Event) => ((arg: unknown) => {
      evt.preventDefault();
      this.store.dispatch('POST_FLOW', 'sameDevice', '{}');
      console.log("open appOpenUrl in new tab: " + arg);
      window.open(arg as string, '_blank');
    })(appOpenUrl);
  }

  postCredentialVerificationRequired() {
    this.pollCheckGetCredential(this.store.getStore().qrUrl as string, 5000);
  }

  async pollCheckGetCredential(currentQrUrl: string, timeout: number) {
    let newState = await this.store.poll();

    if (newState.code === 'RESOURCE_NOT_FOUND') {
      console.log("resource not found, stop polling flow");
      return;
    }

    let pollAgain =
      (newState.status as string) === 'CREDENTIAL_VERIFICATION_REQUIRED' &&
      newState.qrUrl === currentQrUrl;

    if (!pollAgain) {
      this.store
        .dispatch('GET_FLOW')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    } else {
      this.pollCredentialCheckGetHandler = setTimeout(() => {
        this.pollCheckGetCredential(currentQrUrl, timeout);
      }, timeout);
    }
  }

  postContinueCredential() {
    if (document.querySelector("#spinnerId")) {
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
    }
    setTimeout(() => {
      this.store
        .dispatch('POST_FLOW', 'continue', '{}')
        .catch(() => this.generalErrorRenderer(AuthnWidget.COMMUNICATION_ERROR_MSG));
    }, 1000)
  }

  /**
   * validate against the action model.
   * if the model has no data, return empty post body
   * @param action
   * @param data
   * @returns {string|*} the model to be sent to PingFederate after all required fields are available
   */
  validateActionModel(action: string, data: Record<string, unknown>) {
    console.log(`Validating action model ${action}`);
    const model = this.actionModels.get(action);
    if (model === undefined) {
      console.log(`Action Model not found`);
      return undefined;
    }
    console.log(model);
    if (model.properties) {
      //remove unneeded params
      Object.keys(data).forEach(key => !model.properties!.includes(key) ? delete data[key] : '');
    }
    console.log(data);
    return data;
  }

  getForm() {
    return document.getElementById(AuthnWidget.FORM_ID);
  }

  getPasswordResetActions() {
    return ['checkNewPassword', 'checkPasswordReset'];
  }

  getSubmitPhoneTargetActions() {
    return ['submitSmsTarget', 'submitVoiceTarget', 'submitWhatsAppTarget'];
  }

  dispatch(evt: MouseEvent) {
    evt.preventDefault();
    let source = (evt.target || evt.srcElement) as HTMLElement;
    console.log('source: ' + source.dataset['actionid']);
    let actionId = source.dataset['actionid']!;
    let formData = this.getFormData();
    formData = this.validateActionModel(actionId, formData ?? {});
    if (this.getPasswordResetActions().includes(actionId) &&
      !this.verifyPasswordsMatch()) {
      return;
    }

    if (this.getSubmitPhoneTargetActions().includes(actionId)) {
      formData = this.appendCountryCodeToPhoneNumber(formData ?? {})
    }

    this.dispatchWithCaptcha(actionId, formData)
  }

  appendCountryCodeToPhoneNumber(formData: Record<string, unknown>) {
    // Check if both countryCodeInput and phone exist
    if (formData['countryCodeInput'] && formData['phone']) {
      // Concatenate country code with phone number
      const countryCode = formData['countryCodeInput'];
      const phoneNumber = formData['phone'];

      // Combine them
      formData['phone'] = (countryCode as string) + (phoneNumber as string);

      // Remove the countryCodeInput field as backend doesn't need it
      delete formData['countryCodeInput'];
    }
    return formData;
  }

  dispatchWithCaptcha(actionId: string, formData: Record<string, unknown> | undefined) {
    const state = this.store.state;
    if (state.showCaptcha && this.needsCaptchaResponse(actionId)) {
      const type = state.captchaProviderType as string;
      const attributes = state.captchaAttributes;
      const riskUtils = new RiskUtils(type, attributes as RiskAttributes, this.store);
      riskUtils.execute(actionId, (formData ?? {}) as FormDataMap)
    } else {
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
    }
  }

  needsCaptchaResponse(actionId: string) {
    return this.actionModels.get(actionId)
      && this.actionModels.get(actionId)!.properties
      && this.actionModels.get(actionId)!.properties!.some(prop => prop === 'captchaResponse');
  }

  clearPendingState() {
    this.store.clearPendingState();
  }

  getFormData(): Record<string, unknown> | undefined {
    let formElement = this.getForm();
    if (formElement) {
      let formData = new FormData(formElement as HTMLFormElement);
      let convertedData: Record<string, unknown> = {};
      let object: Record<string, unknown> = {};

      // Convert formData to a map. IE11 has incredibly limited support for the FormData type and corresponding methods.
      let formDataEntries = formData.entries(), formDataEntry = formDataEntries.next(), pair;
      while (!formDataEntry.done) {
        pair = formDataEntry.value;
        convertedData[pair[0]] = pair[1];
        formDataEntry = formDataEntries.next();
      }

      for (let key in convertedData) {
        let values = formData.getAll(key);
        if (this.isMultiValueField(formElement, key))
          object[key] = values;
        else
          object[key] = values[0]
      }

      return object;
    }
  }

  isMultiValueField(formElement: HTMLElement, name: string) {
    let inputs = formElement.querySelectorAll<HTMLInputElement>("input[name='" + name + "']");
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

  render(prevState: FlowState, state: FlowState) {
    let currentState = state.status as string;
    let templateName = currentState;
    let template = this.getTemplate('general_error');
    if (currentState) {
      if (currentState === 'BIOMETRIC_DEVICE_AUTHENTICATION_INFO_REQUIRED') {
        templateName = 'ASSERTION_REQUIRED';
      }
      if (currentState === 'DEVICE_MANAGEMENT') {
        templateName = 'DEVICE_SELECTION_REQUIRED';
      }
      try {
        template = this.getTemplate(templateName);
      } catch (e) {
        console.log(`Failed to load template: ${currentState}.`);
        template = this.getTemplate('general_error');
      }
    }
    let widgetDiv = document.getElementById(this.divId);
    const store = { store: this.store };
    var params = Object.assign(state, this.assets.toTemplateParams(), store);
    if (widgetDiv) widgetDiv.innerHTML = template(params);
    this.registerEventListeners(currentState);
    // execute all post render callbacks
    this.postRenderCallbacks[currentState]?.forEach((callback) => { callback(state, this.store) });

    let autofocusInput = document.querySelector<HTMLElement>("input:not(:disabled)[autofocus]")
    if (!autofocusInput) {
      let firstInput = document.querySelector<HTMLElement>("input[type=text]:not(:disabled), input[type=email]:not(:disabled), " +
        "input[type=date]:not(:disabled), input[type=phone]:not(:disabled), input[type=password]:not(:disabled)," +
        "input[type=tel]:not(:disabled)");
      if (firstInput) {
        firstInput.focus();
      }
    }
  }

  getBrowserFlowId(): string {
    const searchParams = queryString.parse(location.search);
    const flowId = searchParams.flowId;
    if (Array.isArray(flowId)) return flowId[0] ?? '';
    return flowId ?? '';
  }

  registerEventListeners(stateName: string) {
    console.log('registering events for: ' + stateName);
    if (stateName && this.eventHandler.get(stateName)) {
      this.eventHandler.get(stateName)!.forEach(fn => fn());
    }
  }

  /**
   * get the corresponding template for the state.
   * By convention, the template should be the same name as the state but in lower case with a handlebars extension
   * @param key name of the state in lower case
   * @returns {template} template content
   */
  getTemplate(key: string) {
    key = key.toLowerCase();
    let template = this.stateTemplates.get(key);
    if (template === undefined) {
      const templatePath = `./partials/${key}.hbs`;
      const templateSource = templateModules[templatePath];
      if (templateSource === undefined) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      template = Handlebars.compile(templateSource);
      this.stateTemplates.set(key, template);
    }
    return template;
  }

  registerState(stateName: string, eventHandlerFn: Array<() => void> = [this.defaultEventHandler]) {
    this.eventHandler.set(stateName, eventHandlerFn);
  }

  addEventHandler(stateName: string, eventHandler: () => void) {
    let evtHandlers = this.eventHandler.get(stateName);
    evtHandlers!.push(eventHandler);
    this.eventHandler.set(stateName, evtHandlers!);
  }

  addPostRenderCallback(stateName: string, callback: (state: FlowState, store?: Store) => void) {
    let callbacks = this.postRenderCallbacks[stateName]
      ? this.postRenderCallbacks[stateName]
      : new Set<(state: FlowState, store?: Store) => void>();
    callbacks.add(callback);
    this.postRenderCallbacks[stateName] = callbacks;
  }

  registerActionModel(action: string, model: ActionModel) {
    this.actionModels.set(action, model);
  }

  checkPopupStatus(windowReference: Window | null) {
    if (windowReference !== null) {
      if (windowReference.closed) {
        clearTimeout(this.checkPopupStatusTimeout)
        this.store
          .dispatch('GET_FLOW')
          .then(() => {
            if (document.querySelector("#spinnerId")) {
              (document.querySelector('#spinnerId') as HTMLElement).style.display = 'none';
            }
            if (document.querySelector("#externalAuthnId")) {
              (document.querySelector('#externalAuthnId') as HTMLElement).style.display = 'block';
            }
          });
      } else {
        this.checkPopupStatusTimeout = setTimeout(() => {
          this.checkPopupStatus(windowReference)
        }, 100);
      }
    } else {
      if (document.querySelector("#spinnerId")) {
        (document.querySelector('#spinnerId') as HTMLElement).style.display = 'none';
      }
      if (document.querySelector("#externalAuthnId")) {
        (document.querySelector('#externalAuthnId') as HTMLElement).style.display = 'block';
      }
    }
  }

  onChangeDropdown(event: Event) {
    (event.target as HTMLElement).classList.remove("placeholder-shown");
  }

  checkDropdownSelected(field: HTMLSelectElement) {
    let selected_options = field.querySelectorAll(`option[selected]`);
    if (selected_options.length > 0)
      field.classList.remove("placeholder-shown");
  }

  handleRegisterUser(event: Event) {
    event.preventDefault();
    let formData = this.getFormData();
    let actionModelProperties = this.actionModels.get('registerUser')!.properties!;

    let payload: Record<string, unknown> = { fieldValues: {} };
    Object.keys(formData ?? {}).forEach((key) => {
      if (actionModelProperties.indexOf(key) >= 0)
        payload[key] = (formData ?? {})[key];
      else {
        let field_value = (formData ?? {})[key];

        if (Array.isArray(field_value)) {
          let values: Record<string, boolean> = {};
          field_value.forEach((option: string) => {
            values[option] = true;
          });
          field_value = values;
        }

        (payload['fieldValues'] as Record<string, unknown>)[key] = field_value;
      }
    });

    this.dispatchWithCaptcha("registerUser", payload)
  }

  verifyRegistrationPassword() {
    let status = document.getElementById('passwordStatus')!;

    let pass1 = qs<HTMLInputElement>('#newpassword');
    let pass2 = qs<HTMLInputElement>('#password');

    if ((pass1?.value.length ?? 0) === 0 || (pass2?.value.length ?? 0) === 0) {
      status.style.display = 'none';
      return;
    } else {
      status.style.display = 'block';
    }

    if (pass1?.value === pass2?.value) {
      status.classList.remove('text-input__icon--error');
      status.classList.add('text-input__icon--success');
    } else {
      status.classList.remove('text-input__icon--success');
      status.classList.add('text-input__icon--error');
      (document.querySelector('#submit') as HTMLButtonElement).disabled = true;
    }
  }

  registerVIPAuthHandler() {
    const enableRadio = () => (document.querySelector('#submit') as HTMLButtonElement).disabled = false;
    const disableRadio = () => (document.querySelector('#submit') as HTMLButtonElement).disabled = true;
    if (document.getElementById('security-code-radio') !== null) {
      document.getElementById('security-code-radio')!
        .addEventListener('click', disableRadio);
    }
    if (document.getElementById('push-radio') !== null) {
      document.getElementById('push-radio')!
        .addEventListener('click', enableRadio);
    }
    if (document.getElementById('sms-radio') !== null) {
      document.getElementById('sms-radio')!
        .addEventListener('click', enableRadio);
    }
    if (document.getElementById('voice-radio') !== null) {
      document.getElementById('voice-radio')!
        .addEventListener('click', enableRadio);
    }
    document.getElementById('submit')!
      .addEventListener('click', this.vipAuthHandler as EventListener);
  }

  vipAuthHandler(evt: MouseEvent) {
    evt.preventDefault();
    const vipAuthentication = qs<HTMLInputElement>('input[name="vipAuthentication"]:checked')!.value;
    if (vipAuthentication === 'push') {
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "initiatePushAuthentication", null);
    } else if (vipAuthentication === 'securityCode') {
      const securityCode = (document.getElementById('security-code') as HTMLInputElement).value;
      const data = { securityCode };
      this.store.dispatch('POST_FLOW', "checkSecurityCode", JSON.stringify(data));
    } else {
      let vipCredentialId;
      if (vipAuthentication === 'sms') {
        vipCredentialId = (document.getElementById("sms-list") as HTMLInputElement).value;
      } else if (vipAuthentication === 'voice') {
        vipCredentialId = (document.getElementById("voice-list") as HTMLInputElement).value;
      }
      const data = { vipCredentialId };
      this.store.dispatch('POST_FLOW', "selectVIPCredential", JSON.stringify(data));
    }
  }

  registerAuthenticationRequiredHandler() {
    Array.from(document.querySelectorAll('[data-authenticator-selection]'))
      .forEach(element => element.addEventListener('click', this.selectAuthenticatorHandler as EventListener), this);
  }

  /**
   * Updates the data submitted for each authenticator button to match the authenticator name.
   *
   * @param evt
   */
  selectAuthenticatorHandler(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let authenticator = source.dataset['authenticatorSelection'];
      const data = { authenticator };
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
      document.getElementById('passcodefield')!.style.display = 'none';
      (document.querySelector('#submit') as HTMLButtonElement).disabled = false;
    }
  }

  registerInputRequiredHandler() {
    Array.from(document.querySelectorAll('[data-checkInput]'))
      .forEach(element => element.addEventListener('click', this.checkInputHandler as EventListener), this);
  }

  /**
   * Handles the different types of data required for the INPUT_REQUIRED use-case for entrust.
   *
   * @param evt
   */
  checkInputHandler(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let answers: Array<{ id: string; answer: string }> = [];
      let data: { answers?: typeof answers; input?: string } = {};
      // Get the answers from the KBA Answer field
      let answerElements = document.getElementsByName('kbaAnswer') as NodeListOf<HTMLInputElement>;
      for (let i = 0; i < answerElements.length; i++) {
        let answer = { id: '', answer: '' };
        let input = answerElements[i];
        answer.id = input.id;
        answer.answer = input.value;
        answers.push({ ...answer });
      }
      data.answers = answers;

      // Either the KBA fields are visible or the passcode field is visible
      let inputElement = document.getElementById('passcode') as HTMLInputElement | null;
      if (null !== inputElement) {
        let input = inputElement.value;
        data.input = input;
      }
      this.store.dispatch('POST_FLOW', 'checkInput', JSON.stringify(data));
    } else {
      console.log("ERROR - Unable to dispatch authenticator selection as the target was null");
    }
  }

  updateDeviceNickname(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let deviceId = source.dataset['deviceId']!;
      const originalNickname = (document.getElementById(deviceId + "_content_container_id")!
        .getElementsByClassName('tile-button__title')[0] as HTMLElement)?.innerText;
      let nicknameInput = document.getElementById(`nickname_input_for_${deviceId}`) as HTMLInputElement | null;
      if (nicknameInput && nicknameInput.value.trim() !== "" && nicknameInput.value !== originalNickname) {
        let data = {
          "id": deviceId,
          "nickname": nicknameInput.value.trim()
        };
        this.renderSpinnerTemplate();
        this.store.dispatch('POST_FLOW', "updateDeviceNickname", JSON.stringify(data));
      }
    }
  }

  transitionToUpdateDeviceNicknameMode(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let deviceId = source.dataset['mfaUpdateDeviceSelectionDeviceId']!;
      Array.from(document.querySelectorAll('[data-mfa-selection]'))
        .forEach(element => {
          if ((element as HTMLElement).dataset['mfaSelection'] === deviceId) {
            element.removeEventListener('click', this.handleMfaDeviceSelection as EventListener)
          }
        });
      const contentContainer = document.getElementById(deviceId + "_content_container_id");
      const originalNickname = (contentContainer!.getElementsByClassName('tile-button__title')[0] as HTMLElement).innerText;
      contentContainer!.style.display = 'none';
      document.getElementById(deviceId + "_update_nickname_id")!.style.display = 'block';
      if (document.getElementById(`update_device_nickname_${deviceId}`) !== null) {
        document.getElementById(`update_device_nickname_${deviceId}`)!
          .addEventListener('click', this.updateDeviceNickname as EventListener);
      }
      (document.getElementById("nickname_input_for_" + deviceId) as HTMLInputElement).value = originalNickname;
      document.getElementById(deviceId + "_kebab_menu_icon_id")!.style.display = 'none';
      document.getElementById(deviceId + "_cancel_icon_id")!.style.display = 'block';
      document.getElementById(deviceId + "_cancel_icon_id")!.addEventListener(
        'click', this.transitionFromUpdateDeviceNicknameMode as EventListener
      );
    }
  }

  transitionFromUpdateDeviceNicknameMode(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let deviceId = source.dataset['mfaCancelUpdateDeviceSelectionDeviceId']!;
      document.getElementById(deviceId + "_content_container_id")!.style.display = 'block';
      document.getElementById(deviceId + "_update_nickname_id")!.style.display = 'none';
      document.getElementById(deviceId + "_kebab_menu_icon_id")!.style.display = 'block';
      document.getElementById(`device-management-popup-frame-${deviceId}`)!.style.display = 'none';
      document.getElementById(deviceId + "_cancel_icon_id")!.style.display = 'none';
      Array.from(document.querySelectorAll('[data-mfa-selection]'))
        .forEach(element => {
          if ((element as HTMLElement).dataset['mfaSelection'] === deviceId) {
            element.addEventListener('click', this.handleMfaDeviceSelection as EventListener)
          }
        });
      evt.stopImmediatePropagation();
    }
  }

  transitionToResyncOathTokenMode(evt: MouseEvent) {
    evt.preventDefault();
    let source = evt.currentTarget as HTMLElement;
    if (source) {
      let deviceId = source.dataset['mfaResyncDeviceSelectionDeviceId']!;
      if (document.getElementById("resyncOathTokenBlock") !== null) {
        document.getElementById("resyncOathTokenBlock")!.style.display = "block";
        if (document.getElementById('resyncCancelButton') !== null) {
          document.getElementById('resyncCancelButton')!
            .addEventListener('click', this.transitionFromResyncOathTokenMode);
        }
        if (document.getElementById('resyncNextButton') !== null) {
          document.getElementById('resyncNextButton')!
            .addEventListener('click', this.resyncOathToken);
        }
        if (document.getElementById('resyncDeviceId') !== null) {
          (document.getElementById('resyncDeviceId') as HTMLInputElement).value = deviceId;
        }
      }
    }
  }

  transitionFromResyncOathTokenMode(_evt?: Event) {
    if (document.getElementById("resyncOathTokenBlock") !== null) {
      document.getElementById("resyncOathTokenBlock")!.style.display = "none";
    }
  }

  resyncOathToken(_evt?: Event) {
    if (document.getElementById("resyncPasscode") !== null) {
      const resyncPasscode = (document.getElementById("resyncPasscode") as HTMLInputElement).value;
      const deviceId = (document.getElementById("resyncDeviceId") as HTMLInputElement).value;
      const data = {
        "id": deviceId,
        "otp": resyncPasscode
      };
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "resyncOathToken", JSON.stringify(data));
    }
  }

  displayDeviceMgmt() {
    const state = this.store.state;
    if (state.newPairingAuthRequired) {
      if (document.querySelector('#authentication_required_block_id') != null) {
        (document.querySelector('#authentication_required_block_id') as HTMLElement).style.display = 'block';
        document.getElementById("auth_for_unpair_message")!.style.display = 'none';
        document.getElementById("auth_for_update_nickname_name_message")!.style.display = 'none';
        document.getElementById("auth_for_pair_message")!.style.display = 'none';
        document.getElementById("auth_for_manage_devices_message")!.style.display = 'block';
        if (document.getElementById('confirmation_button') !== null) {
          document.getElementById('confirmation_button')!
            .addEventListener('click', this.showDeviceMgmt);
        }
      }
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";
    } else {
      this.renderSpinnerTemplate();
      this.store.dispatch('POST_FLOW', "manageDevices", null);
    }
  }

  usePasswordAuth() {
    this.renderSpinnerTemplate();
    this.store.dispatch('POST_FLOW', "usePasswordAuthentication", null);
  }

  showDeviceMgmt() {
    this.handleCancelAuthRequiredWarning();
    this.renderSpinnerTemplate();
    this.store.dispatch('POST_FLOW', "manageDevices", null);
  }

  handleResumeAuthentication() {
    this.renderSpinnerTemplate();
    this.store.dispatch('POST_FLOW', 'resumeAuthentication', null);
  }

  registerCountryCodePickerHandler() {
    let isExpanded = false;
    let selectedCountryCode = "+1";

    setupCountryPicker();

    function setupCountryPicker() {
      const countryCodeInput = document.getElementById('countryCodeInput') as HTMLInputElement | null;
      const dropdownArrow = document.getElementById('dropdownArrow');

      // Only proceed if the country picker elements exist on this page
      if (!countryCodeInput || !dropdownArrow) {
        return;
      }

      // Add input event listener for filtering
      countryCodeInput.addEventListener('input', function (e: Event) {
        filterDropdown((e.target as HTMLInputElement).value);
      });

      // Add click event listener for dropdown toggle
      dropdownArrow.addEventListener('click', function () {
        toggleDropdown();
      });

      // Close dropdown when clicking outside
      window.addEventListener('click', function (e: MouseEvent) {
        const dropdownContainer = document.getElementsByClassName("dropdown-container")[0] as HTMLElement | undefined;
        if (dropdownContainer && !dropdownContainer.contains(e.target as Node)) {
          document.getElementById("dropdownList")!.style.display = 'none';
          document.getElementById("phone")!.classList.remove("hide-phone-input");
          (document.getElementsByClassName("dropdown-container")[0] as HTMLElement).style.width = "30%";
          (document.getElementsByClassName("dropdown-arrow")[0] as HTMLElement).textContent = "v";
          const countryCodeInput2 = document.getElementById("countryCodeInput") as HTMLInputElement;
          countryCodeInput2.value = selectedCountryCode;
          countryCodeInput2.setAttribute("readonly", "true");
          isExpanded = false;
        }
      });

      // Load country data from JSON
      loadCountryData();
    }

    function loadCountryData() {
      // Dynamically load the JSON file and populate the dropdown
      fetch('assets/data/CountriesWithCountryCode.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(response.statusText);
          }
          return response.json();
        })
        .then((data: Array<{ name: string; dialCode: string }>) => {
          // `data` contains the parsed JSON object
          const dropdownList = document.getElementById('dropdownList');
          if (dropdownList) {
            dropdownList.innerHTML = ''; // Clear existing content
          }

          data.forEach((country: { name: string; dialCode: string }) => {
            // Create a new dropdown item
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = `${country.name} (+${country.dialCode})`;
            div.onclick = () => selectOption(country.dialCode); // Add click handler
            if (dropdownList) {
              dropdownList.appendChild(div); // Append to the dropdown list
            }
          });
        })
        .catch(error => {
          console.error('Error fetching country list:', error);
        });
    }

    function toggleDropdown() {
      const dropdownList = document.getElementById("dropdownList") as HTMLElement | null;
      const phoneInput = document.getElementById("phone") as HTMLElement | null;
      const countryCodeInput = document.getElementById("countryCodeInput") as HTMLInputElement | null;
      const dropDownContainer = document.getElementsByClassName("dropdown-container")[0] as HTMLElement | undefined;
      const dropDownArrow = document.getElementsByClassName("dropdown-arrow")[0] as HTMLElement | undefined;

      if (isExpanded) {
        dropdownList!.style.display = 'none';
        phoneInput!.classList.remove("hide-phone-input");
        countryCodeInput!.value = selectedCountryCode;
        countryCodeInput!.placeholder = "";
        countryCodeInput!.setAttribute("readonly", "true");
        dropDownContainer!.style.width = "30%";
        dropDownArrow!.textContent = "v";
      } else {
        dropdownList!.style.display = 'block';
        phoneInput!.classList.add("hide-phone-input");
        countryCodeInput!.value = ""; // Clear input for search
        countryCodeInput!.placeholder = "Search Countries...";
        countryCodeInput!.removeAttribute("readonly");
        countryCodeInput!.focus();
        dropDownContainer!.style.width = "100%";
        dropDownArrow!.textContent = "A";

        // Clear any previous filters to show the full list
        const items = document.getElementsByClassName("dropdown-item");
        for (let item of Array.from(items)) {
          (item as HTMLElement).style.display = "block"; // Reset display to show all items
        }
      }

      isExpanded = !isExpanded;
    }

    function filterDropdown(search: string) {
      const items = document.getElementsByClassName("dropdown-item");
      for (let item of Array.from(items)) {
        const el = item as HTMLElement;
        const text = el.textContent || el.innerText;
        el.style.display = text.toLowerCase().includes(search.toLowerCase()) ? "" : "none";
      }
    }

    function selectOption(countryCode: string) {
      document.getElementById("dropdownList")!.style.display = 'none';
      document.getElementById("phone")!.classList.remove("hide-phone-input");
      (document.getElementsByClassName("dropdown-container")[0] as HTMLElement).style.width = "30%";
      (document.getElementsByClassName("dropdown-arrow")[0] as HTMLElement).textContent = "v";
      const countryCodeInput = document.getElementById("countryCodeInput") as HTMLInputElement;
      countryCodeInput.value = `+${countryCode}`;
      countryCodeInput.setAttribute("readonly", "true");
      selectedCountryCode = `+${countryCode}`;
      isExpanded = false;
    }
  }
}
