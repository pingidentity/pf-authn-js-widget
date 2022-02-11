# Typescript Support

Follow this guide to explore the built-in type definitions for the Authentication Widget. 

## Importing the types
```js
import AuthnWidget, { IAuthnWidget, IOptions, IRedirectlessConfig } from '@ping-identity/pf-authn-js-widget'
```

# Type breakdowns
## `IAuthnWidget`
This interface describes the AuthnWidget class. Sample code:
```ts
var authnWidget: IAuthnWidget = new AuthnWidget("localhost", options: IOptions);
```

## `IOptions`
This interface describes the various constructor parameters for the authnWidget. `divId` is the only required parameter. 
| Parameters          | Type     | Optional |
|---------------------|----------|----------|
| divId               | string   | false    |
| flowId              | string   | true     |
| logo                | string   | true     |
| invokeRecaptcha     | function | true     |
| checkRecaptcha      | string   | true     |
| grecaptcha          | any      | true     |
| useActionParam      | boolean  | true     |
| deviceProfileScript | string   | true     |

<br />

Sample code:
```ts
var options: IOptions = {
    divId: 'authnwidget',
    flowId: 'flowId',
    logo: 'logo.svg',
    invokeReCaptcha: () => {},
    checkRecaptcha: 'checkRecaptcha',
    grecaptcha: {},
    useActionParam: true,
    deviceProfileScript: './pingone-risk-management-profiling.js'
}

var authnWidget: IAuthnWidget = new AuthnWidget("localhost", options);
```

## `IRedirectlessConfig`
This interface describes the redirectless configuration for the authnWidget. Please refer to the [Redirectless Support](/docs/redirectless.md) guide for more infomation on how to configure PingFederate and how to use widget's redirectless feature.

| Config Name             | Type                                | Optional |
|-------------------------|-------------------------------------|----------|
| client_id               | string                              | true     |
| response_type           | string                              | true     |
| onAuthorizationSuccess  | ( response :  Response )  =>   void | false    |
| onAuthorizationRequest  | ()  =>   Promise < Response >       | true     |
| onAuthorizationFailed   | ()  =>   Promise < Response >       | true     |
| scopes                  | string[]                            | true     |
| state                   | string                              | true     |

<br />

Sample code:
```ts
var config: IRedirectlessConfig = {
  client_id: 'im_client',
  response_type: 'token',
  onAuthorizationSuccess: function (response: Response) {
    console.log(response);
  },
};

authnWidget.initRedirectless(config);
```