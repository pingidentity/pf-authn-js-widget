# Using Risk-Based Authentication Adapters with the Authentication Widget

Depending on your adapter configuration, you might need to take additional steps to use the Authentication Widget.

**Table of Contents**
- [ID DataWeb Integration Kit](#id-dataweb-integration-kit)
- [ThreatMetrix Integration Kit](#threatmetrix-integration-kit)

## ID DataWeb Integration Kit

### System requirements and dependencies

* ID DataWeb Integration Kit 1.1 or later

### Setup

If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by a previous adapter`:
1. Copy the `id_dataweb_device_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Add the following to the sign-on page. Adjust the path to the script file.
```html
<script type="text/javascript" src="id_dataweb_device_profiling.js"></script>
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter`, no extra steps are needed.

## ThreatMetrix Integration Kit

### System requirements and dependencies

* ThreatMetrix Integration Kit 1.1 or later

### Setup

If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by a previous adapter`:
1. Depending on the `Device Profiling Script Source`, copy the `tmx_sdk_profiling.js` or `tmx_web_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Add the following to the sign-on page. Adjust the path and file name of the script file.
```html
<script type="text/javascript" src="tmx_<xxx>_profiling.js"></script>
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter` and `Device Profiling Script Source` is set to `ThreatMetrix SDK`:
1. Copy the `tmx_sdk_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Where your web application initializes `PfAuthnWidget`, adjust the path (`deviceProfileScript`) to the script file.
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', deviceProfileScript: './tmx_sdk_profiling.js' });
authnWidget.init();
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter` and `Device Profiling Script Source` is set to `ThreatMetrix Web`, no extra steps are needed.