import { initRedirectless } from './utils/redirectless';
import FetchUtil from './utils/fetchUtil';

export default class Store {
  constructor(flowId, baseUrl, options) {
    this.listeners = [];
    this.prevState = {};
    this.state = {};
    this.flowId = flowId;
    this.baseUrl = baseUrl;
    var useActionParam = (options && options.useActionParam) || false;
    this.fetchUtil = new FetchUtil(baseUrl, useActionParam);
    this.pendingState = {};
    this.registrationflow = false;
    this.cookieless = false;
    this.stateHeader = '';
  }

  setCookieless(flag) {
    this.cookieless = flag;
  }

  setStateHeader(stateHeader) {
    this.stateHeader = stateHeader;
  }

  getStore() {
    return this.state;
  }

  getPreviousStore() {
    return this.prevState;
  }

  async getState() {
    let result = await this.fetchUtil.getFlow(this.flowId, this.buildHeaders());
    return await result.json();
  }

  dispatchErrors(errors) {
    this.state.userMessages = errors;
    this.notifyListeners();
  }

  clearErrors() {
    delete this.state.userMessages;
  }

  async dispatch(method, actionId, payload) {
    this.prevState = this.state;
    this.state = await this.reduce(method, actionId, payload);
    if (this.prevState.username && !this.state.username) {
      this.state.username = this.prevState.username;
    }
    console.log('dispatching actionId: ' + actionId);
    console.log(this.state);
    this.notifyListeners();
  }

  savePendingState(method, actionId, payload) {
    this.pendingState = {
      method, actionId, payload,
    }
  }

  dispatchPendingState(extraPayload) {
    if (this.pendingState) {
      const payLoadString = JSON.stringify({ ...this.pendingState.payload, ...extraPayload });
      this.dispatch(this.pendingState.method, this.pendingState.actionId, payLoadString);
      this.pendingState = {};
    }
  }

  clearPendingState() {
    this.pendingState = {};
  }

  /**
   * based on actionId + payload, return a new state
   * @param flowId
   * @param actionid
   * @param payload
   * @returns {Promise<void>}
   */
  async reduce(method, actionid, payload) {
    this.prevState = this.state;
    let result;
    let json;
    let timeout;
    if (document.querySelector("#spinnerId")) {
      timeout = setTimeout(function() {
        document.querySelector('#spinnerId').style.display = 'block';
        if (document.querySelector("#AuthnWidgetForm")) {
          document.querySelector("#AuthnWidgetForm").style.display = 'none';
        }
        if (document.querySelector(".feedback--error")) {
          document.querySelector(".feedback--error").style.display = 'none';
        }
      }, 600)
    }
    switch (method) {
      case 'GET_FLOW':
        result = await this.fetchUtil.getFlow(this.flowId, this.buildHeaders());
        break;
      case 'INIT_REDIRECTLESS':
        result = await initRedirectless(this.baseUrl, payload);
        break;
      case 'POST_FLOW':
      default:
        result = await this.fetchUtil.postFlow(this.flowId, actionid, payload, this.buildHeaders());
        break;
    }
    json = await result.json();
    if (document.querySelector("#spinnerId")) {
      if (timeout)
        clearTimeout(timeout);
      document.querySelector("#spinnerId").style.display = 'none';
      if (document.querySelector("#AuthnWidgetForm")) {
        document.querySelector("#AuthnWidgetForm").style.display = 'none';
      }
    }

    let combinedData = this.state;
    delete combinedData.userMessages;  //clear previous error shown
    if (json.status) {
      this.flowId = json.id;
      combinedData = json;
      this.state = json;
      if (json.status === 'CANCELED') {
        //read the cancel operation
        switch (json.canceledOperation) {
          case 'PASSWORD_CHANGE':
            this.state.canceledTitle = 'Change Password';
            this.state.canceledMessage = 'You have cancelled the attempt to change your password. Please close this window. ';
            break;
          case 'ACCOUNT_RECOVERY':
            this.state.canceledTitle = 'Account Recovery';
            this.state.canceledMessage = 'You have cancelled the attempt to reset your password. Please close this window.';
            break;
          case 'USERNAME_RECOVERY':
            this.state.canceledTitle = 'Account Recovery ';
            this.state.canceledMessage = 'You have cancelled the attempt to retrieve your username. Please close this window.';
            break;
        }
      } else if (json.status === 'FAILED') {
        if (this.state.code && !this.state.userMessage) {
          this.state.userMessage = `The server returned "${this.state.code}" code. Please contact your system administrator.`;
        }
      } else if (json.status === 'ID_VERIFICATION_REQUIRED' || json.status === 'ID_VERIFICATION_OPTIONS') {
        let errors = this.getErrorDetails(json);
        delete combinedData.failedValidators;
        delete combinedData.satisfiedValidators;
        delete combinedData.userMessages;
        combinedData = { ...errors, ...this.state };
      } else if (json.status === 'OAUTH_DEVICE_USER_CODE_REQUIRED') {
        let errors = this.getErrorDetails(json);
        delete combinedData.authnError;
        delete combinedData.failedValidators;
        delete combinedData.satisfiedValidators;
        delete combinedData.userMessages;
        combinedData = { ...errors, ...this.state };
      }
    } else {
      if (json.code === 'RESOURCE_NOT_FOUND') {
        this.state = {};
      } else {
        let errors = this.getErrorDetails(json);
        delete combinedData.failedValidators;
        delete combinedData.satisfiedValidators;
        delete combinedData.userMessages;
        combinedData = { ...errors, ...this.state };
        if (json._pf_authn_api_state) {
          combinedData = { ...combinedData, _pf_authn_api_state: json._pf_authn_api_state };
        }
      }
    }
    let daysToExpireMsg;
    let daysToExpire = json.daysToExpire;
    if (daysToExpire !== undefined) {
      if (daysToExpire === 0) {
        daysToExpireMsg = "today";
      } else if (daysToExpire === 1) {
        daysToExpireMsg = "tomorrow";
      } else if (daysToExpire > 1) {
        daysToExpireMsg = "in " + daysToExpire + " days";
      }
    }
    combinedData = { ...combinedData, daysToExpireMsg, actionid };
    return combinedData;
  }

  getErrorDetails(json) {
    let errors = {
      errorCode: '',
      errorDetailCodes: [],
      userMessages: [],
      failedValidators: [],
      satisfiedValidators: []
    };
    if (json.code) {
      errors.errorCode = json.code;
      if (json.details) {
        json.details.forEach(it => errors.errorDetailCodes.push(it.code));
      }
    }
    if (json.code && json.code === 'VALIDATION_ERROR' || json.code === "REGISTRATION_FAILED" || json.code === 'REQUEST_FAILED') {
      if (json.details) {
        json.details.forEach(msg => {
          if (msg.failedValidators) {
            msg.failedValidators.map(msg => msg.userMessage).forEach(failMsg => errors.failedValidators.push(failMsg));
          }
          if (msg.satisfiedValidators) {
            msg.satisfiedValidators.map(msg => msg.userMessage).forEach(okMsg => errors.satisfiedValidators.push(okMsg));
          }
          let userMessage = msg.userMessage;
          if (msg.target) {
            userMessage = userMessage.slice(0, -1).concat(' : ').concat(msg.target);
          }
          if (!userMessage && msg.code) {
            userMessage = `Error code "${msg.code}" returned from the authorization server.`
          }
          if(msg.code === 'INVALID_OTP' && msg.attemptsRemaining){
            userMessage += ' You have '+ msg.attemptsRemaining +' attempts remaining.'
          }
          errors.userMessages.push(userMessage);
        });
      } else {
        errors.userMessages = json.userMessage;
      }
    } else if (json.code === 'RESOURCE_NOT_FOUND') {
      errors.userMessages = json.message;
    } else if (json.status === 'ID_VERIFICATION_REQUIRED') {
      if (json.errorDetails) {
        json.errorDetails.forEach(msg => {
          errors.userMessages.push(msg.userMessage);
        })
      }
    } else if (json.status === 'ID_VERIFICATION_OPTIONS') {
      if (json.errorMessage) {
        errors.userMessages.push(json.errorMessage);
      }
    } else if (json.status === 'OAUTH_DEVICE_USER_CODE_REQUIRED') {
      if (json.authnError && json.authnError.details) {
        json.authnError.details.forEach(detail => {
          errors.userMessages.push(detail.userMessage);
        });
      }
    }
    return errors;
  }

  notifyListeners() {
    console.log('notifying # of listeners: ' + this.listeners.length);
    this.listeners.forEach(observer => observer(this.prevState, this.state));
  }

  registerListener(listener) {
    this.listeners.push(listener);
    console.log('registering # of listeners: ' + this.listeners.length);
  }

  async poll(actionId = 'poll', body = '{}') {
    let result = await this.fetchUtil.postFlow(this.flowId, actionId, body, this.buildHeaders());
    return await result.json();
  }

  buildHeaders() {
    let headers = new Map();
    if (this.cookieless) {
      headers.set(this.stateHeader, `${this.state._pf_authn_api_state}`);
    }
    return headers;
  }
}
