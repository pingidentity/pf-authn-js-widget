# Using Client Side Authenticators With the Widget

A **client side authenticator** is a PingFederate plugin that performs part of the authentication in the browser, such as passkeys (WebAuthn). PingFederate's HTML Form adapter and Identifier First adapter can be configured with a client side authenticator; the plugin provides the browser-side JavaScript files and the server-side handler that consumes the result.

When the widget is used with an adapter that has a client side authenticator enabled, PingFederate adds the following fields to the authentication API response:

| Field | Description |
|-------|-------------|
| `authenticatorEnabled` | `true` when a client side authenticator is configured on the adapter |
| `javascriptFilenames` | the script files of the authenticator - filenames, relative paths or full URLs |
| `clientSideAuthenticatorAttributes` | context attributes the authenticator needs to operate |

The `_links` object of the state includes a `useClientSideAuthenticator` action when the authenticator can be invoked.

## What the widget does

When a state is rendered with `authenticatorEnabled`:

1. The username (and password, when present) input is marked with `data-id="authenticator-username"` / `data-id="authenticator-password"` and a `Sign on with Passkey` button is rendered (`data-id="authenticator-button"`), matching the markers used by PingFederate's HTML templates.
2. The authenticator's JavaScript files are loaded. Filenames resolve against PingFederate's `assets/scripts/authenticators/` folder, relative paths and full URLs are used as-is - the same conventions PingFederate uses for its templates.
3. Each script registers itself with `AuthenticatorSupport.registerAuthenticator(obj)` and receives `obj.initAuthenticator({usernameField, passwordField, button, attributes}, submitFunction)`, so it can bind to the page events.
4. When the authenticator completes its client side work it calls `submitFunction()` (or `submitFunction(body)`), which posts the `useClientSideAuthenticator` action back to PingFederate. With no explicit body, the current form fields - including any hidden inputs the authenticator added - are posted.

Because this is the same contract as PingFederate's `authenticator-support.js` used by the HTML Form and Identifier First templates, authenticator scripts written for PingFederate templates work inside the widget unchanged.

## Writing a custom authenticator script

An authenticator script is a self-registering file, for example:

```javascript
const MyAuthenticator = {
  initAuthenticator(obj, submitFunction) {
    // obj.usernameField   - the username input element, or null
    // obj.passwordField   - the password input element, or null
    // obj.button          - the authenticator button element
    // obj.attributes      - the state's clientSideAuthenticatorAttributes
    // submitFunction(body) - posts the useClientSideAuthenticator action

    obj.button.onclick = async () => {
      const assertion = await runWebAuthn(obj.attributes);
      submitFunction({ assertion: assertion });
    };
  }
};

AuthenticatorSupport.registerAuthenticator(MyAuthenticator);
```

## PingFederate configuration

1. Deploy the client side authenticator plugin and place its JavaScript files in `<pf>/server/default/conf/template/assets/scripts/authenticators/` (or reference them by full URL).
2. On the HTML Form adapter or Identifier First adapter instance, select the authenticator in the **Client Side Authenticator** drop-down.
3. The adapter must also be reachable through the authentication API - the widget drives the flow through the authentication API, so the authenticator must support it (`supportsAuthnApi`).

No widget-side configuration is needed; the feature activates automatically when the state response contains `authenticatorEnabled`.
