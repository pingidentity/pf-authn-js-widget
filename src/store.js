
export default class Store {
  constructor(flowId, fetchUtil) {
    this.listeners = [];
    this.prevState = {};
    this.state = {};
    this.flowId = flowId;
    this.fetchUtil = fetchUtil;
  }

  getStore() {
    return this.state;
  }

  async dispatch(method, actionId, payload) {
    this.prevState = this.state;
    this.state = await this.reduce(method, actionId, payload);
    console.log('dispatching actionId: ' + actionId)
    console.log(this.state);
    this.notifyListeners();
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
    switch (method) {
      case 'ERRORS':
        return {...this.state, ...payload};
      case 'GET_FLOW':
        result = await this.fetchUtil.getFlow(this.flowId);
        break;
      case 'POST_FLOW':
      default:
        result = await this.fetchUtil.postFlow(this.flowId, actionid, payload);
        break;
    }
    json = await result.json();
    let combinedData = this.state;
    delete combinedData.userMessage;
    if (json.status) {
      combinedData = json;
      this.state = json;
    } else {
      if(json.code === 'RESOURCE_NOT_FOUND') {
        this.state = {}
      }
      else {
        let errors = this.getErrorDetails(json);
        combinedData = { ...errors, ...this.state };
      }
    }
    return combinedData;
  }

  getErrorDetails(json) {
    let errors = [];
    if(json.code && json.code == 'VALIDATION_ERROR') {
      if(json.details) {
        json.details.forEach(msg => {
          if(msg.failedValidators) {
            msg.failedValidators.forEach(v => {
              errors.push(v.userMessage);
            });
          }
          else {
            errors.push(msg.userMessage + (msg.target ? ': ' + msg.target : ''));
          }
        })

      }
      else {
        errors.push(json.userMessage);
      }
    }
    else if(json.code === 'RESOURCE_NOT_FOUND') {
      errors.push(json.message);
    }
    return {
      userMessage: errors
    };
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
