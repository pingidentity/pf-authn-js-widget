import redirectlessConfigValidator from '../../src/validators/redirectless'

describe('init-redirectless validator', () => {
  test('configuration not null', () => {
    expect(() => {
      redirectlessConfigValidator(null)
    }).toThrow(Error);
  });

  test('configuration not empty', () => {
    expect(() => {
      redirectlessConfigValidator({})
    }).toThrow(Error);
  });

  test('onAuthorizationSuccess attribute not null', () => {
    const configuration = {
      onAuthorizationSuccess: null
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('onAuthorizationSuccess attribute not a string', () => {
    const configuration = {
      onAuthorizationSuccess: 'test'
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('onAuthorizationSuccess attribute not an integer', () => {
    const configuration = {
      onAuthorizationSuccess: 1
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('onAuthorizationSuccess attribute must be a function', () => {
    const configuration = {
      onAuthorizationRequest: () => { },
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).not.toThrow(Error);
  });

  test('onAuthorizationRequest attribute must be a function if present', () => {
    const configuration = {
      onAuthorizationRequest: () => { },
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).not.toThrow(Error);
  });

  test('onAuthorizationRequest attribute not a string if present', () => {
    const configuration = {
      onAuthorizationRequest: 'string',
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('onAuthorizationRequest attribute not an integer if present', () => {
    const configuration = {
      onAuthorizationRequest: 1,
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('onAuthorizationRequest attribute not a boolean if present', () => {
    const configuration = {
      onAuthorizationRequest: true,
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('client_id attribute must be a string if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 'client id',
      response_type: 'token',
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).not.toThrow(Error);
  });

  test('client_id attribute must be present if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('client_id attribute must not be null if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: null,
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('client_id attribute must not be empty if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: '',
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('client_id attribute must not be integer if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 1,
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('response_type attribute must be a string if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 'client id',
      response_type: 'token',
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).not.toThrow(Error);
  });

  test('response_type attribute must be present if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 'client_id',
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('response_type attribute must not be null if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 'client id',
      response_type: null,
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('response_type attribute must not be empty if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 'client id',
      response_type: '',
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });

  test('response_type attribute must not be integer if onAuthorizationRequest attribute is not present', () => {
    const configuration = {
      client_id: 'client id',
      response_type: 1,
      onAuthorizationSuccess: () => { }
    }
    expect(() => {
      redirectlessConfigValidator(configuration)
    }).toThrow(Error);
  });
});