import AuthnWidget from '../../src';
import Store from '../../src/store';
import clientSideAuthenticatorPostRenderCallback from '../../src/utils/clientSideAuthenticatorPostRenderCallback';
import AuthenticatorSupport from '../../src/utils/authenticatorSupport';

describe('Client side authenticator', () => {

  beforeEach(() => {
    // reset the shared registry between tests
    AuthenticatorSupport.authenticators = [];
    AuthenticatorSupport.submitFunction = null;
  });

  test('useClientSideAuthenticator action model is registered', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    expect(authn.actionModels.has('useClientSideAuthenticator')).toBeTruthy();
    expect(authn.actionModels.get('useClientSideAuthenticator')).toEqual({});
  });

  test('post render callback does nothing when authenticator is not enabled', () => {
    Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
    clientSideAuthenticatorPostRenderCallback({}, new Store('flowId', 'https://localhost:9031'));
    expect(Store.prototype.dispatch).toHaveBeenCalledTimes(0);
  });

  test('submit function posts form fields with useClientSideAuthenticator', () => {
    document.body.innerHTML = '<form id="AuthnWidgetForm">' +
      '<input type="text" name="username" value="john" />' +
      '<input type="hidden" name="isAuthenticator" value="true" />' +
      '</form>';
    Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
    const store = new Store('flowId', 'https://localhost:9031');

    clientSideAuthenticatorPostRenderCallback({authenticatorEnabled: true}, store);

    expect(AuthenticatorSupport.submitFunction).not.toBeNull();
    AuthenticatorSupport.submitFunction();
    expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
    expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'useClientSideAuthenticator',
      '{"username":"john","isAuthenticator":"true"}');
  });

  test('submit function posts an explicit body when one is provided', () => {
    Store.prototype.dispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
    const store = new Store('flowId', 'https://localhost:9031');

    clientSideAuthenticatorPostRenderCallback({authenticatorEnabled: true}, store);

    AuthenticatorSupport.submitFunction({usernameless: 'assertion'});
    expect(Store.prototype.dispatch).toBeCalledWith('POST_FLOW', 'useClientSideAuthenticator',
      '{"usernameless":"assertion"}');
  });

  test('registered authenticator is re-bound on initialize', () => {
    const initAuthenticator = jest.fn().mockName('initAuthenticator');
    AuthenticatorSupport.registerAuthenticator({initAuthenticator});

    clientSideAuthenticatorPostRenderCallback({
      authenticatorEnabled: true,
      clientSideAuthenticatorAttributes: {expectedUsername: 'test-username'},
      javascriptFilenames: []
    }, new Store('flowId', 'https://localhost:9031'));

    expect(initAuthenticator).toHaveBeenCalledTimes(1);
    const context = initAuthenticator.mock.calls[0][0];
    expect(context.attributes).toEqual({expectedUsername: 'test-username'});
    expect(typeof initAuthenticator.mock.calls[0][1]).toBe('function');
  });

  test('authenticator button is rendered and bound to the submit function', () => {
    const mockDispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
    Store.prototype.dispatch = mockDispatch;
    document.body.innerHTML = '<div id="authnwidget">' +
      '<form id="AuthnWidgetForm">' +
      '<input type="text" name="username" data-id="authenticator-username" />' +
      '<button id="authenticator-field" data-id="authenticator-button" type="button">Sign on with Passkey</button>' +
      '</form></div>';

    clientSideAuthenticatorPostRenderCallback({authenticatorEnabled: true}, new Store('flowId', 'https://localhost:9031'));

    const button = document.querySelector('[data-id="authenticator-button"]');
    expect(button.dataset.csaFallbackBound).toBe('true');
    button.click();
    expect(mockDispatch).toBeCalledWith('POST_FLOW', 'useClientSideAuthenticator', '{"username":""}');
  });

  test('script filenames resolve following the PingFederate conventions', () => {
    const baseUrl = 'https://localhost:9031';
    expect(AuthenticatorSupport.resolveScriptUrl('test-authenticator.js', baseUrl))
      .toBe('https://localhost:9031/assets/scripts/authenticators/test-authenticator.js');
    expect(AuthenticatorSupport.resolveScriptUrl('scripts/my-authenticator.js', baseUrl))
      .toBe('https://localhost:9031/scripts/my-authenticator.js');
    expect(AuthenticatorSupport.resolveScriptUrl('/assets/scripts/authenticators/test-authenticator.js', baseUrl))
      .toBe('https://localhost:9031/assets/scripts/authenticators/test-authenticator.js');
    expect(AuthenticatorSupport.resolveScriptUrl('https://cdn.example.com/authenticator.js', baseUrl))
      .toBe('https://cdn.example.com/authenticator.js');
  });

  test('registering an invalid authenticator logs an error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    AuthenticatorSupport.registerAuthenticator({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
