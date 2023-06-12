[![Build Status](https://travis-ci.org/pingidentity/pf-authn-js-widget.svg?branch=master)](https://travis-ci.org/pingidentity/pf-authn-js-widget)
# JavaScript Widget for the PingFederate Authentication API

**Table of Contents**
- [JavaScript Widget for the PingFederate Authentication API](#javascript-widget-for-the-pingfederate-authentication-api)
- [PingFederate Configuration](#pingfederate-configuration)
- [Installation](#installation)
  - [Option 1: Using CDN Links](#option-1-using-cdn-links)
  - [Option 2: Building the Widget](#option-2-building-the-widget)
  - [Option 3: Adding the Widget as a Node Module](#option-3-adding-the-widget-as-a-node-module)
  - [Widget Configuration](#widget-configuration)
- [Technical Notes](#technical-notes)
  - [Building the Latest Version of the Widget](#building-the-latest-version-of-the-widget)
  - [Adding the Widget to an Application](#adding-the-widget-to-an-application)
  - [Creating the index.html File](#creating-the-indexhtml-file)
  - [Customizing the Widget](#customizing-the-widget)
  - [Using Risk-Based Authentication With the Widget](/docs/riskAuthentication.md)
  - [Using PingOne Fraud Adapter Flow With the Widget](/docs/pingonefraudIntegration.md)
  - [Redirectless Support](/docs/redirectless.md)
- [Browser Compatibility](#browser-compatibility)
- [Bug Reports](#bug-reports)
- [License](#license)

The JavaScript Widget for the PingFederate Authentication API is a customizable JavaScript library that provides the capabilities of the [HTML form Adapter](https://docs.pingidentity.com/csh?Product=pf-latest&topicname=xvy1564003022890.html) 
and other integrations via [Authentication APIs](https://docs.pingidentity.com/csh?Product=pf-latest&topicname=qsl1564002999029.html), including:
 - user login
 - trouble signing in
 - trouble with username
 - password reset
 - authenticate with identifier
 - risk-based authentication
 - social login
 - multi-factor authentication
 - identity verification
 
 A full list of the supported integrations can be found [here](/docs/supportedIntegrations.md).

The widget is a ready-to-use drop-in bundle with a CSS and customizable templates. This alternative to PingFederate templates provides a sign-in experience as a single page application.

<p align="center">
  <img src="/images/WidgetAnimation.gif" alt="JavaScript Widget for the PingFederate Authentication API">
</p>

# PingFederate Configuration

PingFederate acts as the server interacting with the widget via APIs to authenticate the user.

To configure PingFederate for the widget:
  1. First enable the authentication API: Authentication > Authentication API Applications > Enable Authentication API.
  2. Then, add an application by clicking the "Add Authentication Application" button and entering the appropriate values. For example: **Name:** TestApp, **URL:** `https://localhost:8443`.
  3. Click "Save".
  
  **Caution:** setting your Authentication Application as the "Default Authentication Application" will make it the default authentication for all of your existing connections. This is the easiest way to configure your connections, but it
  is not very precise. For more precision, configure the desired authentication policies to use your Authentication API Application.
  
  4. Select your newly created Authentication Application ("TestApp" if you used the example above) in the drop-down in the "Default Authentication Application" section.
  5. Start the SSO flow as you would normally. For example, by clicking on an existing IdP Connection, and you will be redirected to your "JavaScript Widget for the PingFederate Authentication API" application.

**Note:** The redirect URL of the [Authentication Applications](https://docs.pingidentity.com/csh?Product=pf-latest&topicname=ldc1564002999116.html) must point to where the JavaScript Widget for the PingFederate Authentication API is hosted.
If you do not wish to use the development server provided by webpack, change the URL of the authentication application to point the correct hosted URL.

# Installation

There are three ways to get the widget. You can include it from Ping Identity's CDN, build and install it locally on your development machine or get it as a node dependency.
You also need a running PingFederate instance that is version 9.3 or above.

## Option 1: Using CDN Links:

A pre-built widget is available for incorporating directly into your application. All versions of the widget, starting with 1.7.0, will be available via CDN.

To include the latest released version the following links can be used: 
- https://downloads.pingidentity.com/pf-authn-widget/latest/pf.authn-widget.js
- https://downloads.pingidentity.com/pf-authn-widget/latest/main-styles.css

To include a specific version of the widget, replace `latest` with the version required.
- https://downloads.pingidentity.com/pf-authn-widget/1.7.0/pf.authn-widget.js
- https://downloads.pingidentity.com/pf-authn-widget/1.7.0/main-styles.css

A working example that utilizes the pre-built widget would look like:
```html
<html>
  <head>
    <title>Authentication API Sample App</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <script src="https://downloads.pingidentity.com/pf-authn-widget/latest/pf.authn-widget.js"></script>        
    <link rel="stylesheet" type="text/css" href="https://assets.pingone.com/ux/end-user/0.36.1/end-user.css">
    <link rel="stylesheet" type="text/css" href="https://downloads.pingidentity.com/pf-authn-widget/latest/main-styles.css">
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

## Option 2: Building the Widget

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Then check out this repository.

Run the following commands:
 - `npm install` - install the dependencies
 - `npm run start` - start the webpack development server

This will start the webpack development server on https://localhost:8443 (as specified in webpack.config.js) and instantiate the widget.

If you need to modify the base URL from `localhost:9031`, you can modify it in `demo-server/templates/index-template.handlebars` or pass a `BASEURL` command line parameter (see [Technical Notes](#tech-notes)).

Click the start SSO link on the IdP Connection in PingFederate or start an OAuth flow from OAuth playground, which will redirect to the widget.

Note: A 'flowId' value is required for the widget to interact with PingFederate, which is created when PingFederate redirects to the widget.

## Option 3: Adding the Widget as a Node Module

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
  - **useActionParam**: By default the widget uses a custom content type to request authentication API actions. If this flag is set to true, the widget instead uses a query parameter, which may be required in environments where custom content types are blocked. This query parameter is only supported for version 10.2 of PingFederate and later.

```javascript
var baseUrl = 'https://localhost:9031';
var authnWidget = new PfAuthnWidget(baseUrl, {divId: 'mywidget', logo: 'https://path-to-my-logo.svg', useActionParam: true})
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
  - `https://assets.pingone.com/ux/end-user/0.36.1/end-user.css` - basic CSS from CDN
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
    <link rel="stylesheet" type="text/css" href="https://assets.pingone.com/ux/end-user/0.36.1/end-user.css">
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

## Using Risk-Based Authentication With the Widget

Please refer to the [guide for using risk-based authentication with the widget](/docs/riskAuthentication.md) for more infomation on how to set up the widget with risk-based authentication adapters.

## Using PingOne Fraud Adapter Flow With the Widget

Please refer to the [guide for using PingOne Fraud adapter based authentication flow with the widget](/docs/pingonefraudIntegration.md) for more infomation on how to set up the widget to work with PingOne Fraud authentication adapter flow.

## Redirectless Support 
Please refer to the [Redirectless Support](/docs/redirectless.md) guide for more infomation on how to configure PingFederate and how to use widget's redirectless feature.

## Typescript Support
Please refer to the [Typescript Support](/docs/typescript.md) guide for more information on how to use the typescript definitions.

# Browser Compatibility

The widget relies upon a cookie that is transferred between the widget and PingFederate. If the widget and PingFederate are hosted on different domains, this cookie will be a cross-origin or third-party cookie. Some browsers such as Firefox and Safari block third-party cookies by default, which will break the widget's functionality.

To be compatible with all major browsers, the widget must be deployed on the same domain as PingFederate, or on a subdomain of the same domain. For example, the following configuration will work for all browsers
- PingFederate instance hosted at sso.example.com
- Widget instance hosted at auth.example.com

While the configuration
- PingFederate hosted at sso.example.com
- Widget hosted at auth.differentdomain.com

will require users to enable third-party cookies in their browser configuration.

# Bug Reports

Use the [issue tracker](https://github.com/pingidentity/pf-authn-js-widget/issues) to report any bugs or to file feature requests.

# License

This project is licensed under the Apache license. See the [LICENSE](LICENSE) file for more information.
