# PingFederate Authentication Widget

The PingFederate Authentication Widget is a customizable JavaScript library that provides the capabilities of the [HTML form Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=xvy1564003022890.html) 
and [Identifier First Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=iek1564003022460.html) 
via [Authentication APIs](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=qsl1564002999029.html):
 - User Login
 - Trouble Signing in
 - Trouble with Username
 - Password Reset
 

The widget is a ready-to-use drop-in bundle with CSS and customizable templates. This alternative to PingFederate templates provides a sign-in experience as a Single Page Application.

## PingFederate Configuration

PingFederate acts as the server interacting with the widget via APIs in order to authenticate the user.

There are a few steps that should be followed first to configure PingFederate for the widget:
  1. Enable Authentcation API: Identity Provider > Authentication Applications > Enable Authentication API.
  1. Add an application: Add Authentication Application > Name: TestApp, url:  `https://localhost:8443` > Save > Save.
  1. Create a Password Credential Validator, Html Form Adapter, and an IdP Connection which uses the adapter for SSO (or use OAuth Playground flows to authenticate using Html form adapter)
  1. Create a policy: Policies > Create or Update an existing Policy which uses HTML Form Adapter > Authentication Application > Select the previously created app from the dropdown.
  1. Start SSO flow where you will get redirected to the app.

The redirect URL of the [Authentication Applications](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=ldc1564002999116.html) must point to where the Single Page Application is hosted.
If you wish not to use the development server provided by webpack, just change the url of the authentication app to point to your tomcat or other server instance.

# Installation

There are two ways to get the widget. You can build and install it locally on your development machine or get it as a node dependency.
You will also need a running PingFederate instance version 9.3 or above.

## Option 1: Building the Widget

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Then check out this repository.

Then run the following commands
- `npm install` - install dependencies
- `npm run start` - start the webpack development server

This will start the webpack development server on port https://localhost:8443 (as specified in webpack.config.js) and instantiate your widget. If you need to modify the base url from `localhost:9031`, you can modify it in `demo-server/templates/index-template.handlebars` or pass a `BASEURL` command line parameter.
Click on the start SSO link on the IdP Connection in PingFederate or start an OAuth flow from OAuth playground which will redirect to the widget.
A flowId is required for the widget to interact with PingFederate which is created when PingFederate redirects to the widget.

all available npm commands are:
 - `npm install` - install the dependencies locally
 - `npm run build` - build for production
 - `npm run start` - start the dev server.
 - `BASEURL=https://PingFederateBaseUrl:9031 npm run start` - pass a custom base URL from command line (Mac/Linux only)
 - `npm run clean` - remove `dist/` and `coverage` directory
 - `npm run coverage` - run ESLint coverage
 - `npm run test` - run tests
 - `npm run test:watch` - jest watch the tests

## Option 2: Adding the Widget as a Node Module

This is a good choice if you already have a node project with package.json and can just add this widget as a dependency.
In order to add the dependency run
- `npm install pf-authn-widget --save`
- add `<div id="authnwidget"></div>` to your app
- TODO 

## Widget Configuration

The only information needed to configure the widget is the base URL of the PingFederate instance.

`authnWidget = new PfAuthnWidget(<baseUrl>);`

  - baseUrl: full address of where PingFederate is running such as https://localhost:9031
  - divId where the widget should be rendered (Optional)
  - logo to display on top of every page (this can be passed in as a file or as the url where the image is hosted)
  
  
  `new PfAuthnWidget('https://localhost:9031, {divId: 'mywidget', logo: 'https://path-to-my-logo.svg'}) `

# Technical Notes

## Instantiating the Widget

1. `npm install`
1. `npm run build`
1. copy all the files in the `dist` folder to where your application will be hosted (Can skip this part if we are using webpack's development server)
1. create an `index.html` as follows

At Minimum you must include:
  - `pf.authn-widget.js` - main javascript library
  - `https://assets.pingone.com/ux/end-user/0.13.0/end-user.css` - basic css from CDN
  - `main-styles.css` - widget css
 
Create a file called `index.html` with the following content and host it in your web server such as Tomcat or just use the webpack development server for testing.

        <html>
        <title>Authentication API Sample App</title>        
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
          <script src="./pf.authn-widget.js"></script>        
          <link rel="stylesheet" type="text/css" href="https://assets.pingone.com/ux/end-user/0.13.0/end-user.css">
          <link rel="stylesheet" type="text/css" href="main-styles.css">
    
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


The name of the div can be overwritten in the constructor under options by passing a `divId` parameter.

## Customizing the Widget

All the html pages are rendered using [Handlebars](https://handlebarsjs.com/) under the `/partials` directory. `/scss/` folder contains all the sass files for customizing the styles.
Basic CSS should be imported by default from CDN. 

Note: There are a few things that must not be customized.
- `data-actionId` must match the actionId that is sent to PingFederate
- Form Ids in the handlebars templates must match what's being referenced in the index.js `FORM_ID`
- Basic CSS `end-user.css` is provided via CDN as shown in `demo-server/templates/index-template.handlebars`
- Widget specific css is provided via compiled sass file as `main-styles.css`
- In order to overwrite the CSS, add any customization to `src/scss/branding.scss` and include it in `src/index.js`


## Enabling Captcha

To use Captcha with the HTML Form Adapter, import `api.js` from Google's CDN at `<script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script>`
After the script is loaded, instantiate the widget. Three functions are needed:

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
           
It is crucial that the `api.js` is loaded first before we intantiate the widget therefore we're using a callback function to load the widget. `grecaptcha` object
will be available once the `api.js` is loaded. For more information please see [Captcha documentations](https://developers.google.com/recaptcha/docs/display).           

# Compatibility

The widget works with all major browsers, including Chrome, Firefox, IE11 and IE Edge.

# Bug Reports

Please use the issue tracker to report any bugs or to file feature requests.

# License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more information.
