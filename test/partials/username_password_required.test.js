import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import clientSideAuthenticatorPostRenderCallback from '../../src/utils/clientSideAuthenticatorPostRenderCallback';
import AuthenticatorSupport from '../../src/utils/authenticatorSupport';
import Store from '../../src/store';

const loadTemplate = (name) =>
  handlebars.compile(fs.readFileSync(path.join(__dirname, '../../src/partials', name), 'utf8'));

// the context object the PF authenticator scripts receive - the fields
// pingid-passwordless.js dereferences unconditionally
const initContextFor = (html) => {
  document.body.innerHTML = html;
  AuthenticatorSupport.submitFunction = null;
  AuthenticatorSupport.attributes = null;
  AuthenticatorSupport.usernameField = document.querySelector('[data-id="authenticator-username"]');
  AuthenticatorSupport.passwordField = document.querySelector('[data-id="authenticator-password"]');
  AuthenticatorSupport.authenticatorButton = document.querySelector('[data-id="authenticator-button"]');
  return {
    usernameField: AuthenticatorSupport.usernameField,
    passwordField: AuthenticatorSupport.passwordField,
    button: AuthenticatorSupport.authenticatorButton,
    attributes: {},
  };
};

describe('USERNAME_PASSWORD_REQUIRED partial', () => {
  beforeAll(() => {
    handlebars.registerHelper('readonlyhelper', () => '');
    handlebars.registerHelper('checkedIf', () => '');
    handlebars.registerHelper('renderRiskUI', () => new handlebars.SafeString(''));
    handlebars.registerPartial('errors', '');
    handlebars.registerPartial('spinner', '');
    handlebars.registerPartial('alternate_authn_sources', '');
  });

  test('renders username/password data-id markers and the authenticator button', () => {
    const html = loadTemplate('username_password_required.hbs')({
      authenticatorEnabled: true,
      _links: { checkUsernamePassword: { href: 'x' } }
    });
    expect(html.includes('data-id="authenticator-username"')).toBe(true);
    expect(html.includes('data-id="authenticator-password"')).toBe(true);
    expect(html.includes('data-id="authenticator-button"')).toBe(true);
  });

  test('renders the button on authenticatorEnabled alone, matching the PF templates', () => {
    // PF strips the useClientSideAuthenticator action when the CSA does not support
    // the authn API, but authenticatorEnabled + scripts/attributes are still sent
    const html = loadTemplate('username_password_required.hbs')({
      authenticatorEnabled: true,
      _links: { checkUsernamePassword: { href: 'x' } }
    });
    expect(html.includes('data-id="authenticator-button"')).toBe(true);
  });

  test('does not render markers or button without authenticatorEnabled', () => {
    const html = loadTemplate('username_password_required.hbs')({
      _links: { checkUsernamePassword: { href: 'x' } }
    });
    expect(html.includes('data-id="authenticator-username"')).toBe(false);
    expect(html.includes('data-id="authenticator-password"')).toBe(false);
    expect(html.includes('data-id="authenticator-button"')).toBe(false);
  });

  test('initAuthenticator context has every element the PF passwordless script dereferences', () => {
    // mirrors the usage at pingid-passwordless.js:288-296 - obj.button is dereferenced
    // unconditionally (remove(), setAttribute(), onclick), username/password are guarded
    const html = loadTemplate('username_password_required.hbs')({
      authenticatorEnabled: true,
      _links: { checkUsernamePassword: { href: 'x' } }
    });
    const context = initContextFor(html);
    expect(context.button).not.toBeNull();
    expect(context.usernameField).not.toBeNull();
    expect(context.passwordField).not.toBeNull();
  });

  test('full flow: post-render callback passes a non-null button to the authenticator', () => {
    AuthenticatorSupport.authenticators = [];
    const initAuthenticator = jest.fn().mockName('initAuthenticator');
    AuthenticatorSupport.registerAuthenticator({ initAuthenticator });

    document.body.innerHTML = loadTemplate('username_password_required.hbs')({
      authenticatorEnabled: true,
      _links: { checkUsernamePassword: { href: 'x' } }
    });

    clientSideAuthenticatorPostRenderCallback(
      { authenticatorEnabled: true, javascriptFilenames: [], clientSideAuthenticatorAttributes: {} },
      new Store('flowId', 'https://localhost:9031'));

    expect(initAuthenticator).toHaveBeenCalledTimes(1);
    const context = initAuthenticator.mock.calls[0][0];
    expect(context.button).not.toBeNull();
    expect(context.usernameField).not.toBeNull();
    expect(context.passwordField).not.toBeNull();
    expect(typeof initAuthenticator.mock.calls[0][1]).toBe('function');
  });
});
