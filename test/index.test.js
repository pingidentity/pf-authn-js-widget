//test constructor cannot start without flowId
import AuthnWidget from '../src'

describe('Test Constructor', () => {
  test('make sure constructor throws an error without baseUrl', () => {
    expect(AuthnWidget).toThrow(Error);
  });

  test('Test valid constructor without options', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    expect(authn.fetchUtil.baseUrl).toBe('https://localhost:9031');
    expect(authn.actionModels.has('checkUsernamePassword')).toBeTruthy();
    expect(AuthnWidget.CORE_STATES).toContain('USERNAME_PASSWORD_REQUIRED');
    expect(authn.store !== null).toBeTruthy();
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

});

