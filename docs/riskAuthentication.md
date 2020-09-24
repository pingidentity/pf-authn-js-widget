# Guide for Using Risk-Based Authentication With the Widget

Extra steps may be required to set up the widget when using adapters with risk-based authentication ability.

**Table of Contents**
- [ID DataWeb Integration Kit](#id-dataweb-integration-kit)
- [ThreatMetrix Integration Kit](#threatmetrix-integration-kit)

## ID DataWeb Integration Kit

### System requirements and dependencies

* ID DataWeb Integration Kit 1.1 or later

### Setup

If you have configured the adapter so that the `Device Profiling Method` is set to `Captured by this adapter`, no extra setup is required as the widget will be able to run the device profiling script with information provided by the adapter. However if you have chosen `Captured by a previous adapter` you will need to place the device profiling script that came with the kit (`id_dataweb_device_profiling.js`) to where your application will be hosted and attach the following script in the index.html that you have created. 
```html
<script type="text/javascript" src="id_dataweb_device_profiling.js"></script>
```

## ThreatMetrix Integration Kit

### System requirements and dependencies

* ThreatMetrix Integration Kit 1.1 or later

### Setup

If you have configured the adapter so that the `Device Profiling Method` is set to `Captured by this adapter` and `Device Profiling Script Source` is set to `ThreatMetrix Web` then no extra setup is required. However if `Device Profiling Script Source` is set to `ThreatMetrix SDK`, you will need to make sure `deviceProfileScript` is included when `PfAuthnWidget` is initialized.
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', deviceProfileScript: './assets/tmx_sdk_profiling.js' });
authnWidget.init();
```

If you have chosen `Captured by a previous adapter` you will need to place the device profiling script that came with the kit (`tmx_sdk_profiling.js` or `tmx_web_profiling.js`) to where your application will be hosted and attach the following script in the index.html that you have created. 
```html
<script type="text/javascript" src="tmx_sdk_profiling.js"></script>
```