//test constructor cannot start without flowId
import AuthnWidget from '../../src'
import Store from "../../src/store";

describe('Alternate Auth Source tests', () => {

  jest.mock('../../src/store');

  test('Test handle auth source', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    let target = { "dataset": { "altauthsource": "testsource"}};
    let evt = { "currentTarget": target };
    evt.preventDefault = jest.fn().mockName("preventDefault");
    Store.prototype.dispatch = jest.fn().mockName("dispatch").mockResolvedValue("42");

    authn.handleAltAuthSource(evt);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    expect(Store.prototype.dispatch).toHaveBeenCalledTimes(1);
    expect(Store.prototype.dispatch).toBeCalledWith("POST_FLOW", "useAlternativeAuthenticationSource", "{\"authenticationSource\":\"testsource\"}");
  });

  test('Test no target on event', () => {
    const authn = new AuthnWidget('https://localhost:9031');
    let evt = { };
    evt.preventDefault = jest.fn().mockName("preventDefault");
    Store.prototype.dispatch = jest.fn().mockName("dispatch").mockResolvedValue("42");

    authn.handleAltAuthSource(evt);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    expect(Store.prototype.dispatch).toHaveBeenCalledTimes(0);
  });

  test('Test button has handler registered and triggered on click.', () => {
    const mockHandle = jest.fn().mockName("handleAltAuthSource");
    document.body.innerHTML = '<div><button id="testing" data-altauthsource="testing"/></div>';
    const authn = new AuthnWidget('https://localhost:9031');
    authn.handleAltAuthSource = mockHandle;
    authn.registerAltAuthSourceLinks();

    document.getElementById("testing").click();

    expect(mockHandle).toBeCalledTimes(1);
  });
});