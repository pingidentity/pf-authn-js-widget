//test constructor cannot start without flowId
import AuthnWidget from '../../src'
import Store from "../../src/store";

describe('REGISTRATION_REQUIRED tests', () => {

  jest.mock('../../src/store');

  test('Test handle auth source', () => {
    document.body.innerHTML = '<form id="AuthnWidgetForm">' +
      '<input type="text" name="textField1" value="valueForTextField1" />' +
      '<input type="text" name="textField2" value="valueForTextField2" />' +
      '<input type="password" name="password" value="valueForPassword" />' +
      '</form>';

    let expectedJSON = {
      "fieldValues": {
        "textField1": "valueForTextField1",
        "textField2": "valueForTextField2"
      },
      "password": "valueForPassword"
    }

    const authn = new AuthnWidget('https://localhost:9031');
    authn.dispatchWithCaptcha = jest.fn().mockName("dispatchWithCaptcha");
    let evt = {};
    evt.preventDefault = jest.fn().mockName("preventDefault");
    authn.handleRegisterUser(evt);

    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    expect(authn.dispatchWithCaptcha).toHaveBeenCalledTimes(1);
    expect(authn.dispatchWithCaptcha).toBeCalledWith("registerUser", expectedJSON);
  });

  test('Test register button triggers registration handler.', () => {
    const mockHandle = jest.fn().mockName("handleRegisterUser");
    document.body.innerHTML = '<div><button id="testing" data-registrationactionid="registerUser"/></div>';
    const authn = new AuthnWidget('https://localhost:9031');
    authn.handleRegisterUser = mockHandle;
    authn.registerRegistrationLinks();

    document.getElementById("testing").click();

    expect(mockHandle).toBeCalledTimes(1);
  });
});