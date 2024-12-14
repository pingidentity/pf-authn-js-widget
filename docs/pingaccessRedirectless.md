# PingAccess Redirectless support

PingAccess specific callback functions used to build a configuration object for [redirectless mode](/docs/redirectless.md).
After successfully completing the redirectless flow, APIs protected by PingAccess can be accessed by configuring the 
fetch API or XMLHttpRequest API to include credentials. This configuration will ensure that the PingAccess session 
cookie, established by the redirectless flow, is included in API requests.   

## Usage

### `paOnAuthorizationRequest` function

This function returns a configuration object `onAuthorizationRequest` callback function. A [PingFederate Authentication 
API Challenge](https://docs.pingidentity.com/pingaccess/latest/pingaccess_user_interface_reference_guide/pa_acr_generator_descriptions.html) response is passed 
to this function as the first argument.

### `paOnAuthorizationSuccess` function

This function returns a configuration object `onAuthorizationSuccess` callback function. A [PingFederate Authentication
API Challenge](https://docs.pingidentity.com/pingaccess/latest/pingaccess_user_interface_reference_guide/pa_acr_generator_descriptions.html) response is passed 
to this function as the first argument. An error-first callback function is passed to this function as the second argument.

Here is an example:

```javascript
var authnWidget = new PfAuthnWidget("https://localhost", { divId: 'authnwidget' });
var config = {
  onAuthorizationRequest: PfAuthnWidget.paOnAuthorizationRequest(response),
  onAuthorizationSuccess: PfAuthnWidget.paOnAuthorizationSuccess(response, function(err, resp) {
    if (err) {
      doSomething(err);
      return;
    }

    doSomethingElse(resp);
  })
};
authnWidget.initRedirectless(config);
```