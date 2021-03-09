# PingAccess Redirectless support

PingAccess specific callback functions used to build a configuration object for [redirectless mode](/docs/redirectless.md).    

## Usage

### `paOnAuthorizationRequest` function

This function returns a configuration object `onAuthorizationRequest` callback function. A [PingFederate Authentication 
API Challenge](https://docs.pingidentity.com/csh?Product=pa-latest&topicname=bsa1607124104609.html) response is passed 
to this function as the first argument.

### `paOnAuthorizationSuccess` function

This function returns a configuration object `onAuthorizationSuccess` callback function. A [PingFederate Authentication
API Challenge](https://docs.pingidentity.com/csh?Product=pa-latest&topicname=bsa1607124104609.html) response is passed 
to this function as the first argument. An error-first callback function is passed to this function as the second argument.

Here is an example:

```javascript
var authnWidget = new PfAuthnWidget("https://localhost", { divId: 'authnwidget' });
var config = {
  onAuthorizationRequest: paOnAuthorizationRequest(response),
  onAuthorizationSuccess: paOnAuthorizationSuccess(response, function(err, resp) {
    if (err) {
      doSomething(err);
      return;
    }

    doSomethingElse(data);
  })
};
authnWidget.initRedirectless(config);
```