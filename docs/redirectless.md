# Redirectless support
In PingFederate, you can configure mobile applications to authenticate through REST APIs as OAuth clients without needing to handle HTTP redirections. When authentication is complete, the applications receive an OAuth authorization code or access token, and possibly an OpenID Connect ID token.

Single-page web applications can also use redirectless mode if administrators configure them in PingFederate as authentication applications.
## PingFederate configuration
1. Follow the instructions at [README.md](../README.md#pingfederate-configuration) to configure Authentication API in PingFederate.
1. Create a new OAuth 2.0 client at Application > OAuth > Clients
1. Allow 'allow authentication API OAuth initiation' on the newly created OAuth 2.0 client.
1. Select 'restricted common scopes' required by the client.
1. Select appropriate grant types.

## Usage
To make use of the redirectless flow the following steps must be taken:
- Create an instance of the widget by providing the base URL and the necessary options
- Create a `configuration` object to provide the necessary redirectless settings. 
- Call `initRedirectless` and pass the `configuration` object as an argument.

An example is show below: 
```javascript
var authnWidget = new PfAuthnWidget("https://localhost", { divId: 'authnwidget' });
var config = {
  client_id: 'test',
  response_type: 'token id_token',
  onAuthorizationSuccess: function (response) {
    console.log(response);
  }
};
widget.initRedirectless(config);
```
## Configuration object
There are two ways to create a configuration to initiate the redirectless flow:
1. The configuration object contains `onAuthorizationSuccess` and the required attributes (e.g. `client_id`, `response_type`, etc.) used by the internal authorization request function.
1. The configuration object contains `onAuthorizationRequest` and `onAuthorizationSuccess` functions.

Most deployments should use the first option. The second option is there for advanced use-cases.

### `onAuthorizationRequest` function
This callback function is going to be called during the authorization request. It doesn't have any arguments and it's expected to return a JavaScript `Promise` which completes the authorization request call to PingFederate.

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
The `credentials: 'include'` Options attribute is required to make sure PingFederate's session cookie is handled correctly by the browser.

### `onAuthorizationSuccess` function
This callback function is designed to return the result of the transaction to the webpage containing the authentication API widget. The protocol response is passed to this function as the first argument when called by the authentication API widget.

Here is an example: 
```js
var config = {
  onAuthorizationSuccess: function (response) {
    console.log(response.access_token);
  }
};
```

### Supported attributes
The following attributes are supported by the internal onAuthorizationRequest function: `client_id`, `response_type`, `code_challenge`, `code_challenge_method`, `redirect_uri`, `scope`, `state`, `idp`, `pfidpadapterid`, `access_token_manager_id`, `aud`, `nonce`, `prompt`, `acr_values`, `max_age`, `login_hint`, `ui_locales`, `id_token_hint`, `claims_locales`. 

The `client_id` and `response_type` attributes are required if `onAuthorizationRequest` is not present. 

The present key-value pairs will be appended to the authorization request URL, the value will be URL encoded and arrays will be concatenated and URL encoded into one string.

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
  }
};
```