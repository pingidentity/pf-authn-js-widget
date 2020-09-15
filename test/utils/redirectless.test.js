import { generateAuthorizationUrl } from '../../src/utils/redirectless';

describe('redirectless authorization url', () => {
  test('Basic authorization URL test, base URL without trailing "/"', () => {
    const url = generateAuthorizationUrl('https://localhost:9031', { client_id: 'clientId' });
    expect(url).toBe('https://localhost:9031/as/authorization.oauth2?client_id=clientId&response_mode=pi.flow');
  });

  test('Basic authorization URL test, base URL with trailing "/"', () => {
    const url = generateAuthorizationUrl('https://localhost:9031/', { client_id: 'clientId' });
    expect(url).toBe('https://localhost:9031/as/authorization.oauth2?client_id=clientId&response_mode=pi.flow');
  });

  test('Basic authorization URL test, client id contains a space', () => {
    const url = generateAuthorizationUrl('https://localhost:9031', { client_id: 'client id' });
    expect(url).toBe('https://localhost:9031/as/authorization.oauth2?client_id=client%20id&response_mode=pi.flow');
  });

  test('Basic authorization URL test, multi-value scope array', () => {
    const url = generateAuthorizationUrl('https://localhost:9031', { client_id: 'clientId', scope: ['openid', 'profile'] });
    expect(url).toBe('https://localhost:9031/as/authorization.oauth2?client_id=clientId&scope=openid%20profile&response_mode=pi.flow');
  });

  test('Basic authorization URL test, single-value scope array', () => {
    const url = generateAuthorizationUrl('https://localhost:9031', { client_id: 'clientId', scope: ['openid'] });
    expect(url).toBe('https://localhost:9031/as/authorization.oauth2?client_id=clientId&scope=openid&response_mode=pi.flow');
  });

  test('Basic authorization URL test, ignore unsupported query parameter', () => {
    const url = generateAuthorizationUrl('https://localhost:9031', { client_id: 'clientId', unsupported: 'unsupported' });
    expect(url).toBe('https://localhost:9031/as/authorization.oauth2?client_id=clientId&response_mode=pi.flow');
  });

  test('Basic authorization URL test, change authorizationEndpoint parameter', () => {
    const url = generateAuthorizationUrl('https://localhost:9031', { client_id: 'clientId' }, '/as/authorize');
    expect(url).toBe('https://localhost:9031/as/authorize?client_id=clientId&response_mode=pi.flow');
  });

});