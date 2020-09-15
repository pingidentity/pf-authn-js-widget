[![Build Status](https://travis-ci.org/pingidentity/pf-authn-js-widget.svg?branch=master)](https://travis-ci.org/pingidentity/pf-authn-js-widget)
# JavaScript Widget for the PingFederate Authentication API

**Table of Contents**
- [JavaScript Widget for the PingFederate Authentication API](#javascript-widget-for-the-pingfederate-authentication-api)
  - [PingFederate Configuration](#pingfederate-configuration)
- [Installation](#installation)
  - [Option 1: Building the Widget](#option-1-building-the-widget)
  - [Option 2: Adding the Widget as a Node Module](#option-2-adding-the-widget-as-a-node-module)
  - [Widget Configuration](#widget-configuration)
- [Technical Notes](#technical-notes)
  - [Building the Latest Version of the Widget](#building-the-latest-version-of-the-widget)
  - [Adding the Widget to an Application](#adding-the-widget-to-an-application)
  - [Creating the index.html File](#creating-the-indexhtml-file)
  - [Customizing the Widget](#customizing-the-widget)
  - [Enabling Captcha](#enabling-captcha)
  - [Using Risk-Based Authentication With the Widget](/docs/riskAuthentication.md)
  - [Redirectless Support](/docs/redirectless.md)
- [Browser Compatibility](#browser-compatibility)
- [Bug Reports](#bug-reports)
- [License](#license)

The JavaScript Widget for the PingFederate Authentication API is a customizable JavaScript library that provides the capabilities of the [HTML form Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=xvy1564003022890.html), the [Identifier First Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=iek1564003022460.html), and the [ID DataWeb Integration Kit](https://docs.pingidentity.com/bundle/integrations/page/ndg1577481773402.html)
via [Authentication APIs](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=qsl1564002999029.html), including:
 - user login
 - trouble signing in
 - trouble with username
 - password reset
 - authenticate with identifier
 - risk-based authentication

The widget is a ready-to-use drop-in bundle with a CSS and customizable templates. This alternative to PingFederate templates provides a sign-in experience as a single page application.

<p align="center">
  <img src="/images/WidgetAnimation.gif" alt="JavaScript Widget for the PingFederate Authentication API">
</p>

## PingFederate Configuration

PingFederate acts as the server interacting with the widget via APIs to authenticate the user.

To configure PingFederate for the widget:
  1. Enable the authentication API: Identity Provider > Authentication Applications > Enable Authentication API.
  1. Add an application: Add Authentication Application > Name: TestApp, URL:  `https://localhost:8443` > Save > Save.
  1. Create a Password Credential Validator, HTML Form Adapter, and an IdP Connection that uses the adapter for SSO. Alternatively, use OAuth Playground flows to authenticate using the HTML Form Adapter.
  1. Create a policy: Policies > Create (or update an existing policy) that uses the HTML Form Adapter > Authentication Application > Select the previously created app from the dropdown.
  1. Start SSO flow where you will get redirected to the app.

The redirect URL of the [Authentication Applications](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=ldc1564002999116.html) must point to where the single page application is hosted.
If you do not want to use the development server provided by webpack, change the URL of the authentication application to point the correct URL.

# Installation

There are two ways to get the widget. You can build and install it locally on your development machine or get it as a node dependency.
You also need a running PingFederate instance that is version 9.3 or above.

## Option 1: Building the Widget

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Then check out this repository.

Run the following commands:
 - `npm install` - install the dependencies
 - `npm run start` - start the webpack development server

This will start the webpack development server on https://localhost:8443 (as specified in webpack.config.js) and instantiate the widget.

If you need to modify the base URL from `localhost:9031`, you can modify it in `demo-server/templates/index-template.handlebars` or pass a `BASEURL` command line parameter (see [Technical Notes](#tech-notes)).

Click the start SSO link on the IdP Connection in PingFederate or start an OAuth flow from OAuth playground, which will redirect to the widget.

Note: A 'flowId' value is required for the widget to interact with PingFederate, which is created when PingFederate redirects to the widget.

## Option 2: Adding the Widget as a Node Module

This is a good choice if you already have a node project with `package.json` and can just add this widget as a dependency.

To add the widget as a dependency:
1. Run `npm install @ping-identity/pf-authn-js-widget --save`
2. Add `<div id="authnwidget"></div>` to your app.

## Widget Configuration

The only information required to configure the widget is PingFederate's base URL. The widget can be instantiated and initialized using the following code example:
```javascript
var baseUrl = 'https://localhost:9031';
var authnWidget = new PfAuthnWidget(baseurl);
authnWidget.init();
```

Here are all the available constructor parameters, their descriptions, and a usage code example:
  - **baseUrl**: full address of where PingFederate is running, such as https://localhost:9031
  - **divId**: where the widget should be rendered (optional)
  - **logo**: to display on top of every page (this can be passed in as a file or as the URL where the image is hosted)

```javascript
var baseUrl = 'https://localhost:9031';
var authnWidget = new PfAuthnWidget(baseUrl, {divId: 'mywidget', logo: 'https://path-to-my-logo.svg'})
authnWidget.init();
```

<a name="tech-notes"></a>
# Technical Notes

Here are all available npm commands:

-  `npm install` - install the dependencies locally
-  `npm run build` - build for production
-  `npm run start` - start the dev server
-  `BASEURL=https://PingFederateBaseUrl:9031 npm run start` - pass a custom base URL from the command line (Mac/Linux only)
-  `npm run clean` - remove the `dist/` and `coverage` directory
-  `npm run coverage` - run ESLint coverage
-  `npm run test` - run tests
-  `npm run test:watch` - just watch the tests

## Building the Latest Version of the Widget

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Then check out this repository.

To build the widget:
1. `npm install`
1. `npm run build`
1. Copy all the files in the `dist` folder to where your application will be hosted (this part can be skipped if webpack's development server is used).
1. Create an `index.html` as shown below.

## Adding the Widget to an Application

At minimum you must include:
  - `pf.authn-widget.js` - main javascript library
  - `https://assets.pingone.com/ux/end-user/0.29.0/end-user.css` - basic CSS from CDN
  - `main-styles.css` - widget CSS

## Creating the index.html File

Create a file called `index.html` with the following content and host it in your web server.

```html
<html>
  <head>
    <title>Authentication API Sample App</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <script src="./pf.authn-widget.js"></script>        
    <link rel="stylesheet" type="text/css" href="https://assets.pingone.com/ux/end-user/0.29.0/end-user.css">
    <link rel="stylesheet" type="text/css" href="main-styles.css">
    <script>
      function load() {
        var authnWidget = new PfAuthnWidget("{{baseUrl}}", { divId: 'authnwidget' });
        authnWidget.init()
      }
      window.onload = load;
    </script>
  </head>

  <body>
    <div class="content" style="padding: 30px">
      <div class="heading">Authentication Application</div>
      <div id="authnwidget"></div>
    </div>
  </body>
</html>
```

The name of the div can be overwritten in the constructor under options by passing a `divId` parameter.

## Customizing the Widget

All the HTML pages are rendered using [Handlebars](https://handlebarsjs.com/) under the `/partials` directory. The `/scss/` folder contains all the sass files for customizing the styles.
Basic CSS should be imported by default from CDN.

Note: Some items cannot be customized:
- the `data-actionId` must match the actionId that is sent to PingFederate
- the form IDs in the handlebars templates must match what's being referenced in the index.js `FORM_ID`
- the basic CSS `end-user.css` is provided via CDN, as shown in `demo-server/templates/index-template.handlebars`
- the widget-specific CSS is provided via the compiled sass file as `main-styles.css`
- to overwrite the CSS, add any customization to `src/scss/branding.scss` and include it in `src/index.js`

## Enabling Captcha

To use Captcha with the HTML Form Adapter, import `api.js` from Google's CDN at `<script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script>`
After the script is loaded, instantiate the widget.

Three functions are needed:

```javascript
var authnWidget;

function checkRecaptcha(token) {
  console.log('captcha response: ' + token);
  if (token.length === 0) {
    //reCaptcha not verified
    dispatchPendingState.clearPendingState();
    console.log('did not pass captcha try again');
  } else {
    //reCaptch verified
    authnWidget.dispatchPendingState(token);
  }
}

function invokeReCaptcha() {
  let token = grecaptcha.getResponse();
  if(token) {
    checkRecaptcha(token);
  }
  else {
    grecaptcha.execute();
  }
}

function onloadCallback() {
  authnWidget = new PfAuthnWidget("{{baseUrl}}", {
    divId: 'authnwidget',
    invokeReCaptcha: invokeReCaptcha,
    checkRecaptcha: 'checkRecaptcha',
    grecaptcha: grecaptcha
  });
  authnWidget.init();
}
```
It is crucial that `api.js` is loaded before the widget is instantiated. Therefore we are using a callback function to load the widget. The `grecaptcha` object
will be available after the `api.js` is loaded. For more information, see [Captcha documentations](https://developers.google.com/recaptcha/docs/display).

## Using Risk-Based Authentication With the Widget

Please refer to the [guide for using risk-based authentication with the widget](/docs/riskAuthentication.md) for more infomation on how to set up the widget with risk-based authentication adapters.

## Redirectless Support 
Please refer to the [Redirectless Support](/docs/redirectless.md) guide for more infomation on how to configure PingFederate and how to use widget's redirectless feature.

# Browser Compatibility

The widget works with all major browsers, including Chrome, Firefox, IE11, and MS Edge.

# Bug Reports

Use the [issue tracker](https://github.com/pingidentity/pf-authn-js-widget/issues) to report any bugs or to file feature requests.

# License

This project is licensed under the Apache license. See the [LICENSE](LICENSE) file for more information.
