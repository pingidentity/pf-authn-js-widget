# Using Risk-Based Authentication Adapters with the Authentication Widget

Depending on your adapter configuration, you might need to take additional steps to use the Authentication Widget.

**Table of Contents**
- [ID DataWeb Integration Kit](#id-dataweb-integration-kit)
- [ThreatMetrix Integration Kit](#threatmetrix-integration-kit)
- [PingOne Risk Management Integration Kit](#pingone-risk-management-integration-kit)

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

If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by a previous adapter` and `Device Profiling Script Source` is set to `ThreatMetrix SDK`:
1. Copy the `tmx_sdk_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Add the following to the sign-on page. Adjust the path and file name of the script file.
```html
<script type="text/javascript" src="tmx_sdk_profiling.js"></script>
<script type="text/javascript">pinghelper.run("<deviceProfilingDomain>", "<orgId>");</script>
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by a previous adapter` and `Device Profiling Script Source` is set to `ThreatMetrix Web`:
1. Copy the `tmx_web_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Add the following to the sign-on page. Adjust the path and file name of the script file.
```html
<script type="text/javascript" src="tmx_web_profiling.js"></script>
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter` and `Device Profiling Script Source` is set to `ThreatMetrix SDK`:
1. Copy the `tmx_sdk_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Where your web application initializes `PfAuthnWidget`, adjust the path (`deviceProfileScript`) to the script file.
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', deviceProfileScript: './tmx_sdk_profiling.js' });
authnWidget.init();
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter` and `Device Profiling Script Source` is set to `ThreatMetrix Web`, no extra steps are needed.

## PingOne Risk Management Integration Kit

### System requirements and dependencies

* PingOne Risk Management Integration Kit 1.0 or later

### Setup
1. Copy the `fingerprint2-2.1.4.min.js` and `pingone_risk_management_adapter_device_profiling.js` files from the integration `.zip` file to a location that your application can access. 
2. Add the following to your application's sign-on page. Adjust the path to the script files.
```html
<script type="text/javascript" src="fingerprint2-2.1.4.min.js"></script>
<script type="text/javascript" src="pingone_risk_management_adapter_device_profiling.js"></script>
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by a previous adapter`:
1. Copy the `pingone_risk_management_adapter_embedded_profiling.js` file from the integration `.zip` file to a location that your application can access.
2. Add the following to the sign-on page. Adjust the path to the script file.
```html
<script type="text/javascript" src="pingone_risk_management_adapter_embedded_profiling.js"></script>
```
If the `Device Profiling Method` setting in your adapter configuration is set to `Captured by this adapter`:
1. Where your web application initializes `PfAuthnWidget`, adjust the path (`deviceProfileScript`) to the script file.
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', deviceProfileScript: './pingone_risk_management_adapter_device_profiling.js' });
authnWidget.init();
```
