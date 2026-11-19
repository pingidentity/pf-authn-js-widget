import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import clientSideAuthenticatorPostRenderCallback from '../../src/utils/clientSideAuthenticatorPostRenderCallback';
import AuthenticatorSupport from '../../src/utils/authenticatorSupport';
import Store from '../../src/store';

const loadTemplate = (name) =>
  handlebars.compile(fs.readFileSync(path.join(__dirname, '../../src/partials', name), 'utf8'));

describe('IDENTIFIER_REQUIRED partial', () => {
  beforeAll(() => {
    handlebars.registerHelper('readonlyhelper', () => '');
    handlebars.registerHelper('checkedIf', () => '');
    handlebars.registerHelper('renderRiskUI', () => new handlebars.SafeString(''));
    handlebars.registerPartial('errors', '');
    handlebars.registerPartial('spinner', '');
    handlebars.registerPartial('identifier_signon', loadTemplate('identifier_signon.hbs'));
    handlebars.registerPartial('alternate_authn_sources', '');
  });

  test('renders exactly one authenticator button in the account-list view', () => {
    const html = loadTemplate('identifier_required.hbs')({
      authenticatorEnabled: true,
      previouslySubmittedIdentifiers: ['user1', 'user2'],
      _links: { useClientSideAuthenticator: { href: 'x' } }
    });
    expect((html.match(/authenticator-button/g) || []).length).toBe(1);
  });

  test('renders exactly one authenticator button in the plain signon view', () => {
    const html = loadTemplate('identifier_required.hbs')({
      authenticatorEnabled: true,
      _links: { useClientSideAuthenticator: { href: 'x' } }
    });
    expect((html.match(/authenticator-button/g) || []).length).toBe(1);
  });

  test('renders the button based on authenticatorEnabled alone, like the PF templates', () => {
    // PF strips the useClientSideAuthenticator action when the CSA does not support
    // the authn API, but still sends authenticatorEnabled + the scripts/attributes
    const html = loadTemplate('identifier_required.hbs')({
      authenticatorEnabled: true,
      _links: { cancelIdentifierSubmission: { href: 'x' } }
    });
    expect(html.includes('data-id="authenticator-button"')).toBe(true);
  });

  test('does not render the authenticator button when the state omits it', () => {
    const html = loadTemplate('identifier_required.hbs')({
      previouslySubmittedIdentifiers: ['user1'],
      _links: { cancelIdentifierSubmission: { href: 'x' } }
    });
    expect(html.includes('authenticator-button')).toBe(false);
  });

  test('widget binds the visible button rendered by the template', () => {
    AuthenticatorSupport.authenticators = [];
    AuthenticatorSupport.submitFunction = null;
    const mockDispatch = jest.fn().mockName('dispatch').mockResolvedValue('42');
    Store.prototype.dispatch = mockDispatch;

    document.body.innerHTML = loadTemplate('identifier_required.hbs')({
      authenticatorEnabled: true,
      previouslySubmittedIdentifiers: ['user1'],
      _links: { cancelIdentifierSubmission: { href: 'x' } }
    });

    clientSideAuthenticatorPostRenderCallback(
      { authenticatorEnabled: true, javascriptFilenames: [] },
      new Store('flowId', 'https://localhost:9031'));

    const bound = document.querySelector('[data-id="authenticator-button"]');
    expect(bound).not.toBeNull();
    expect(bound.dataset.csaFallbackBound).toBe('true');
    expect(bound.closest('#signonidentifier')).toBeNull();
  });
});
