//test constructor cannot start without flowId
import AuthnWidget from '../src'

describe('AuthnWidget index', () => {
  test('make sure constructor throws an error without baseUrl', () => {
    expect(AuthnWidget).toThrow(Error);
  });

  test('Test valid constructor without options', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    expect(authn.fetchUtil.baseUrl).toBe('https://localhost:9031');
    expect(authn.actionModels.has('checkUsernamePassword')).toBeTruthy();
    expect(AuthnWidget.CORE_STATES).toContain('USERNAME_PASSWORD_REQUIRED');
    expect(authn.store !== null).toBeTruthy();
    expect(authn.eventHandler.get('USERNAME_PASSWORD_REQUIRED')).toContain(authn.defaultEventHandler);
  });

  test('validateActionModel method test', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    expect(authn.validateActionModel('invalidModel')).toBe(undefined);
    let data = {
      username: 'john',
      password: 'password1',
      invalidParam: 'value1'
    }
    let expectedData = {
      username: 'john',
      password: 'password1'
    }
    expect(authn.validateActionModel('checkUsernamePassword', data)).toEqual(expectedData);
  });

  test('Register new State', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    authn.registerState('NEW_STATE_NAME');
    //must automatically get defaultEventHandler and registered
    expect(authn.eventHandler.get('NEW_STATE_NAME')).toContain(authn.defaultEventHandler);

    //if we register a new state with customEvent it must include it as well as defaultHandler
    const customHandler = e => e;
    authn.registerState('NEW_CUSTOM_STATE_NAME', [customHandler]);
    expect(authn.eventHandler.get('NEW_CUSTOM_STATE_NAME')).toContain(customHandler);
  });

  test('Register Action Model', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    let model = {required: ['username', 'password'], properties: ['username', 'password', 'rememberMyUsername', 'thisIsMyDevice', 'captchaResponse']};
    authn.registerActionModel('CUSTOM_ACTION', model);
    expect(authn.actionModels.get('CUSTOM_ACTION')).toEqual(model);
  });

  test('Test AddEventHandler', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    const customHandler = e => e;
    authn.addEventHandler('USERNAME_PASSWORD_REQUIRED', customHandler);
    expect(authn.eventHandler.get('USERNAME_PASSWORD_REQUIRED')).toContain(customHandler);
  });

});

