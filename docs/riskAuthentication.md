# Guide for Using Risk-Based Authentication With the Widget

Extra steps may be required to set up the widget when using adapters with risk-based authentication ability.

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
- Make sure `deviceProfileScript` is included when your application initializes `PfAuthnWidget`.
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', deviceProfileScript: './assets/tmx_sdk_profiling.js' });
authnWidget.init();
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter` and `Device Profiling Script Source` is set to `ThreatMetrix Web`, no extra steps are needed.