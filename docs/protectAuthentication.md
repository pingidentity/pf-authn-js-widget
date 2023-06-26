# Using Protect-Based Authentication Adapters with the Authentication Widget

### System requirements and dependencies

* PingOne Protect Integration Kit 1.0 or later

### Setup
1. Copy the `signals-sdk-<version>.js` file from the integration `.zip` file to a location that your application can access. Replace `<version>` with the version of the signals SDK that you are using.
2. Copy the `pingone-protect-device-profiling.js` file from the integration `.zip` file to a location that your application can access.
3. Add the following to your application's sign-on page. Adjust the path to the script file.

```html

<script type="text/javascript" src="signals-sdk-<version>.js"></script> <!-- Replace <version> with the version of the signals SDK that you are using. -->
<script type="text/javascript" src="pingone-protect-device-profiling.js"></script>
```
4. Where your web application initializes `PfAuthnWidget`, adjust the path (`deviceProfileScript`) to the script file.
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', deviceProfileScript: './pingone-protect-device-profiling.js' });
authnWidget.init();
```
