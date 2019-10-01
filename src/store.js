
export default class Store {
  constructor(flowId, fetchUtil, checkRecaptcha) {
    this.listeners = [];
    this.prevState = {};
    this.state = {};
    this.flowId = flowId;
    this.fetchUtil = fetchUtil;
    this.checkRecaptcha = checkRecaptcha;
    this.pendingState = {};
  }

  getStore() {
    return this.state;
  }

  async dispatch(method, actionId, payload) {
    this.prevState = this.state;
    this.state = await this.reduce(method, actionId, payload);
    if(this.prevState.status === 'NEW_PASSWORD_REQUIRED') {
      this.state.userTitle = 'Change Password';
    }
    else if(this.prevState.status === 'ACCOUNT_RECOVERY_USERNAME_REQUIRED') {
      this.state.userTitle = 'Account Recovery';
    }
    if(this.prevState.username && !this.state.username) {
      this.state.username = this.prevState.username;
    }
    console.log('dispatching actionId: ' + actionId)
    console.log(this.state);
    this.notifyListeners();
  }

  savePendingState (method, actionId, payload) {
    this.pendingState = {
      method, actionId, payload,
    }
  }

  dispatchPendingState(token) {
    if(this.pendingState) {
      let payLoadString = JSON.stringify({...this.pendingState.payload, ...{captchaResponse: token}});
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
    if(document.querySelector("#spinnerId")) {
      console.log('showing spinner...');
      timeout = setTimeout(function () {
        document.querySelector('#spinnerId').style.display = 'block'
      }, 600)
    }
    switch (method) {
      case 'GET_FLOW':
        result = await this.fetchUtil.getFlow(this.flowId);
        break;
      case 'POST_FLOW':
      default:
        result = await this.fetchUtil.postFlow(this.flowId, actionid, payload);
        break;
    }
    json = await result.json();
    if(document.querySelector("#spinnerId")) {
      if(timeout)
        clearTimeout(timeout);
      document.querySelector("#spinnerId").style.display ='none';
      console.log('hiding spinner....');

    }
    let combinedData = this.state;
    delete combinedData.userMessage;  //clear previous error shown
    if (json.status) {
      combinedData = json;
      this.state = json;
    } else {
      if(json.code === 'RESOURCE_NOT_FOUND') {
        this.state = {};
      }
      else {
        let errors = this.getErrorDetails(json);
        combinedData = { ...errors, ...this.state };
      }
    }
    let daysToExpireMsg;
    let daysToExpire = json.daysToExpire;
    if(daysToExpire !== undefined) {
      if (daysToExpire === 0) {
        daysToExpireMsg = "today";
      } else if (daysToExpire === 1) {
        daysToExpireMsg = "tomorrow";
      } else if (daysToExpire > 1) {
        daysToExpireMsg = "in " + daysToExpire + " days";
      }
    }
    combinedData = {...combinedData, checkRecaptcha: this.checkRecaptcha, daysToExpireMsg};
    return combinedData;
  }

  getErrorDetails(json) {
    let errors = {};
    if(json.code && json.code == 'VALIDATION_ERROR') {
      if(json.details) {
        json.details.forEach(msg => {
          errors.failedValidators = msg.failedValidators ? msg.failedValidators.map(msg => msg.userMessage) : "";
          errors.satisfiedValidators = msg.satisfiedValidators ? msg.satisfiedValidators.map(msg => msg.userMessage) : "";

          let userMessage = msg.userMessage;
          if(msg.target) {
            userMessage = userMessage.slice(0, -1).concat(' : ').concat(msg.target);
          }
          errors.userMessage = userMessage;
        });
      }
      else {
        errors.userMessage = json.userMessage;
      }
    }
    else if(json.code === 'RESOURCE_NOT_FOUND') {
      errors.userMessage = json.message;
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
}
