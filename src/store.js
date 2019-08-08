
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

  async dispatch(actionId, payload) {
    this.prevState = this.state;
    this.state = await this.reduce(actionId, payload);
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
  async reduce(actionid, payload) {
    this.prevState = this.state;
    let result;
    switch (actionid) {
      case 'GET_FLOW':
        result = await this.fetchUtil.getFlow(this.flowId);
        break;
      case 'POST_FLOW':
      default:

        result = await this.fetchUtil.postFlow(this.flowId, actionid, payload);
        break;
    }
    let json = await result.json();
    let combinedData = this.state;
    if (json.status) {
      combinedData = json;
      this.state = json;
    } else {
      combinedData = {...json, ...this.state};
    }
    if (json && json._links) {
      let actions = this.getAvailableActions(json._links);
      combinedData = {...combinedData, ...actions};  //make actions available to template
    }
    return combinedData;
  }

  getAvailableActions(json) {
    return Object.keys(json).filter(key => 'self' !== key);
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
