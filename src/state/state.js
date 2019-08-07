import * as States from "../states";

export default class State {

  constructor(divId, flowId, fetchUtil) {
    this.divId = divId;
    this.flowId = flowId;
    this.fetchUtil = fetchUtil;
    this.state = {};
  }

  _getFormData = () => new FormData(document.getElementById('AuthnWidgetForm'));

  renderState = async (data) => {
    let combinedData = data;
    if (data.status) {
      this.state = data;
    } else {
      combinedData = {...data, ...this.state};
    }
    let template = States.stateTemplates.get(combinedData.status);

    if (data && data._links) {
      let actions = this.getAvailableActions(data._links);
      combinedData = {...data, actions};  //make actions available to template
    } else {  //TODO
      //error case - we have to render the errors on the previous state/template we showed (we should keep the data sent?)
      console.log('TODO ' + data);
    }

    document.getElementById(this.divId).innerHTML = template(combinedData);
    document.getElementById("authn-widget-submit").addEventListener("click", this.dispatch);
  }

  renderError = data => {
    console.log('rendering error page: ' + data);
  }
  dispatch = async(event) => {
    console.log(event);
    if(event) {
      event.preventDefault();
    }
    let source = event.target || event.srcElement
    console.log('source: ' + source.dataset['actionid']);
    document.getElementById("authn-widget-submit").removeEventListener("click", this.dispatch);
    let result = await this.fetchUtil.postFlow(this.flowId, source.dataset['actionid'], JSON.stringify(Object.fromEntries(this._getFormData())));
    let json = await result.json();
    this.renderPage(result, json);

    //post to PF with the data

  }


  getAvailableActions = (json) => {
    return Object.keys(json)
      .filter(key => 'self' !== key);
  }

  renderPage = (result, json) => {
    if (result.ok) {
      try {
        console.log(json);
        if(json.status === 'RESUME') {
          window.location.replace(json.resumeUrl);
        }
        else {
          // this.renderState(this._getErrorDetails(json));
          this.renderState(json);
        }

      }
      catch (e) {
        throw e;//new AuthnApiError(e);
      }
    }
    else {
      console.log(result.statusText); //TODO parse validation error and display
      if(json.code === 'VALIDATION_ERROR') {
        this.renderState(json);
      }
      else {  //TODO render general error page code it against the errors in com.pingidentity.sdk.api.authn.common.CommonErrorSpec
        console.log(json.message);
        this.renderError(json); //{"code":"RESOURCE_NOT_FOUND","message":"The requested resource was not found."}

      }
    }
  }

}
