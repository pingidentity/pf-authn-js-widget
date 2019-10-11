# PingFederate Authentication Widget

The PingFederate Authentication Widget is a JavaScript library that provides all the capabilities of the [HTML form Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=xvy1564003022890.html) via [Authentication APIs](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=qsl1564002999029.html)
:
 - Login
 - Trouble Signing in
 - Trouble with Username
 - Password Reset

The widget is a ready-to-use drop-in bundle with CSS and customizable templates. This alternative to PingFederate templates provides a sign-in experience with a Single Page Application look and feel.

# Installation

There are two ways to get the widget. You can build and install it locally on your development machine or get it as a node dependency.

## Option 1: Building the Widget

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Check out this repository first.

This will start the webpack devserver on port https://localhost:8443 (as specified in webpack.config.js) and instantiate your widget. If you need to modify the base url from `localhost:9031`, you can modify it in `demo-server/templates-index-template.handlebars`.

## Option 2: Adding the Widget as a Node Module

This is a good choice if you already have a project and can just add this widget as a dependency.

npm commands:
 - `npm install` - install the dependencies locally
 - `npm run build` - build for production
 - `npm run start` - start the dev server
 - `npm run clean` - remove `dist/` directory
 - `npm test` - run tests


# Configuration

To use the PingFederate Authentication Widget, first set the widget's configuration parameters. Then configure PingFederate.

## Widget Configuration

The only information needed to configure the widget is the base URL of the PingFederate instance.

`authnWidget = new PfAuthnWidget(str baseUrl, obj params);`

  - baseUrl: full address of where PingFederate is running such as https://localhost:9031
  - divId where the widget should be rendered (Optional)
  - logo to display on top of every page (this can be passed in as a file or as the url where the image is hosted)

## PingFederate Configuration

The redirect URL of the [Authentication Applications](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=ldc1564002999116.html) must point to where the Single Page Application is hosted.

To configure PingFederate for the widget:
  1. Enable Authentication Applications.
  1. Add an Authentication Application whose redirect uri is where this app will be hosted.
  1. Create a policy tree branch where the adapter will reside and attach the authentication application to the policy tree.
  1. Start SSO flow where you will get redirected to the app.

# Technical Notes

## Instantiating the Widget

Just add the following script to your application's onload function.

        <script>
          var authnWidget = new PfAuthnWidget("https://localhost:9031", { divId: 'authnwidget' });
          authnWidget.init();
        </script>

Add a div where the widget should render as follows:

        <div id="authnwidget" />

The name of the div can be overwritten in the constructor under options.

## Customizing the Widget

Handlebars templates are used for rendering the pages under the `/partials` directory. CSS should be imported by default from CDN. Any customization should be done under the `/scss/` folder to overwrite the existing CSS. All handlebars templates can be customized for any formatting.

Note: There are a few things that must not be customized.
- `data-actionId` must match the actionId that is sent to PingFederate
- Form Ids in the handlebars templates must match what's being referenced in the index.js `FORM_ID`


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

# Compatibility

The widget works with all major browsers, including Chrome, Firefox, IE11 and IE Edge.

# Bug Reports

Please use the issue tracker to report any bugs or to file feature requests.

# License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more information.
