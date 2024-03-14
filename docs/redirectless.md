# Redirectless support
In PingFederate, you can configure mobile applications to authenticate through REST APIs as OAuth clients without needing to handle HTTP redirections. When authentication is complete, the applications receive an OAuth authorization code or access token, and possibly an OpenID Connect ID token.

Single-page web applications can also use redirectless mode if administrators configure them in PingFederate as authentication applications.
## PingFederate configuration
1. Follow the instructions at [README.md](../README.md#pingfederate-configuration) to configure the Authentication API in PingFederate.
1. In the administrative console, go to Applications > OAuth > Clients and add a new OAuth 2.0 client.
1. On the new client, select the 'Allow Authentication API Redirectless Mode' check box ('Allow Authentication API OAuth Initiation' prior to 11.0).
1. Select the 'Restrict Common Scopes' check box and the client's restricted scopes.
1. Select the client's 'Allowed Grant Types'.

## Usage
To use the redirectless flow:
- Create an instance of the widget by providing PingFederate's base URL and the necessary options.
- Create a `configuration` object to provide the necessary redirectless settings. 
- Call `initRedirectless` and pass the `configuration` object as an argument.

Here's an example: 
```javascript
var authnWidget = new PfAuthnWidget("https://localhost", { divId: 'authnwidget' });
var config = {
  client_id: 'test',
  response_type: 'token id_token',
  onAuthorizationSuccess: function (response) {
    console.log(response);
  },
  onAuthorizationFailed: function (response) {
      console.log(response);
  }
};
authnWidget.initRedirectless(config);
```
## Configuration object
There are multiple options for creating the configuration object to initiate the redirectless flow:
### Simple
Create a configuration object that contains the `onAuthorizationSuccess` function and the required attributes (such as `client_id`, `response_type`, etc.) used by the internal authorization request function.
This option should support majority of deployments.
### Advanced
Create a configuration object that contains the `onAuthorizationRequest` and `onAuthorizationSuccess` functions. This option is for advanced use-cases.
### OAuth 2.0 Device Authorization Grant
Create a configuration object containing the `onAuthorizationSuccess` function and a `flowType` attribute set to `PfAuthnWidget.FLOW_TYPE_USER_AUTHZ`. This configuration initializes the Authentication API Widget to interact with PingFederate's user authorization endpoint. Optionally, the `user_code` attribute can be provided. If provided, it is passed to the user authorization endpoint as a query parameter, which will trigger a state where the user must confirm the code (rather than having to enter it). An example is present [here](#oauth-20-device-authorization).

### Cookieless 
The cookieless configuration allows the widget to operate without using HTTP cookies. The PingFederate OAuth 2.0 client must be configured appropriatly inorder for this mode to work correctly.

By enabling this mode, the widget will handle the state management required by the cookieless functionality. the `cookieless` and `stateHeaderName` are attributes controlling this mode.
- `cookieless` attribute is boolean, defaulting to `false`
- `stateHeaderName` attribute specifices the header name to send the state back to PingFederate. If not specified the default `X-Pf-Authn-Api-State` value will be used.

An example of the cookieless configuration can be found below:
```javascript
var config = {
  client_id: 'test',
  response_type: 'token',
  cookieless: true,
  stateHeaderName: 'X-Pf-Authn-Api-State',
  onAuthorizationSuccess: function (response) {
    console.log(response);
  },
  onAuthorizationFailed: function (response) {
      console.log(response);
  }
};
```

### Callback function descriptions
#### `onAuthorizationRequest` function
This callback function is called during the authorization request. It has no arguments and it's expected to return a JavaScript `Promise`, which completes the authorization request call to PingFederate.
[PingAccess redirectless support](/docs/pingaccessRedirectless.md).

Here's an example:
```javascript
var config = {
  onAuthorizationRequest: function () {
    var url = 'https://localhost:9031/as/authorization.oauth2?client_id=test&response_type=token&response_mode=pi.flow'
    var options = {
      method: 'GET',
      credentials: 'include'
    }
    return fetch(url, options);
  }
}
```
The `options` attribute `credentials: 'include'` is required to ensure the browser correctly handles PingFederate's session cookie.

#### `onAuthorizationSuccess` function
This callback function returns the result of the transaction to the webpage containing the Authentication API widget. The protocol response is passed to this function as the first argument when the Authentication API widget calls it.
[PingAccess redirectless support](/docs/pingaccessRedirectless.md).

Here is an example: 
```js
var config = {
  onAuthorizationSuccess: function (response) {
    console.log(response.access_token);
  }
};
```

#### `onAuthorizationFailed` function
This callback function returns the state of the Authentication API to the webpage containing the Authentication API widget when the authorization fails. The entire API state is passed to this function as the first argument when the Authentication API widget calls it.
[PingAccess redirectless support](/docs/pingaccessRedirectless.md).

Here is an example:
```js
var config = {
  onAuthorizationFailed: function (response) {
    console.log(response);
  }
};
```

### Supported attributes
The internal implementation of `onAuthorizationRequest` function supports the following attributes: `client_id`, `response_type`, `code_challenge`, `code_challenge_method`, `redirect_uri`, `scope`, `state`, `idp`, `pfidpadapterid`, `access_token_manager_id`, `aud`, `nonce`, `prompt`, `acr_values`, `max_age`, `login_hint`, `ui_locales`, `id_token_hint`, `claims_locales`.

The `client_id` and `response_type` attributes are required if `onAuthorizationRequest` is not present or the `flowType` value is __not__ `PfAuthnWidget.FLOW_TYPE_USER_AUTHZ`.

The key-value pairs will be appended to the authorization request URL, their values will be URL encoded, and arrays will be concatenated and URL encoded into one string.

## Configuration object examples
### OAuth 2.0 implicit
This code snippet demonstrates a simple OAuth 2.0 configuration used by the Authentication API widget redirectless flow.
```javascript
var config = {
  client_id: 'test',
  response_type: 'token',
  scopes: ['a', 'b', 'c'],
  onAuthorizationSuccess: function (response) {
    console.log(response.access_token);
  },
  onAuthorizationFailed: function (response) {
      console.log(response);
  }
};
```
### OpenID Connect
This code snippet demonstrates a simple OpenID Connect configuration used by the Authentication API widget redirectless flow.
```javascript
var config = {
  scope: ['openid', 'profile', 'email', 'address', 'phone'],
  state: '3f05dd88-3e97-496f-ba04-50e36e7ee1a5', // must be generated per each request.
  client_id: 'test',
  response_type: 'id_token',
  onAuthorizationSuccess: function (response) {
    console.log(response.id_token);
  },
  onAuthorizationFailed: function (response) {
    console.log(response);
  }
};
```

### OAuth 2.0 Device Authorization
This code snippet demonstrates how to configure the Authentication API Widget to interact with PingFederate's User Authorization endpoint
```js
var pingfederateUrl = 'https://localhost'
var authnWidget = new PfAuthnWidget(pingfederateUrl, { divId: 'authnwidget' });
var config = {
  flowType: PfAuthnWidget.FLOW_TYPE_USER_AUTHZ,
  // the optional user_code parameter
  // user_code: "A1B2-C3D4",
  onAuthorizationSuccess: function (response) {
    console.log('success');
  },
  onAuthorizationFailed: function (response) {
    console.log('fail');
  }
};
authnWidget.initRedirectless(config);
```

## Starting webpack-dev-server with redirectless support
To configure and start the webpack-dev-server with redirectless support:
1. Update the demo server's [index template](../demo-server/templates/index-template.handlebars) file with a configuration object. Configuration object examples are available in the [Configuration object examples](#configuration-object-examples) section of this document.
1. Execute the following command to start the webpack-dev-server and initialize the widget in redirectless mode:
    ```bash
    OPERATIONMODE=redirectless npm run start
    ```
1. In your browser, go to https://localhost:8443 to see the widget in action.
