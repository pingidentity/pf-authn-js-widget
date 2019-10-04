# PingFederate Authentication Widget

PingFederate Authentication Widget is a javascript library that provides full capabilities of [HTML form Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=xvy1564003022890.html) via [Authentication APIs](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=qsl1564002999029.html) in a ready to use drop-in bundle along 
with CSS and customizable templates.

This provides an alternative solution to PingFederate templates which allows for a Single Page Application look and feel for the sign in experience.

The only information needed is the Base URL of the PingFederate instance where it is configured to use [Authentication Applications](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=ldc1564002999116.html).

The configured Authentication Application redirect URL must point to where the Single Page Application is hosted. 



# Installation

There are two ways to get the widget. You can build and install it locally on your development machine or get it as a node dependency.

# Build 

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Check out this repository first.


This will start the webpack devserver on port https://localhost:8443 (as specified in webpack.config.js) and instantiate your widget. If you need to modify the base url from `localhost:9031`, you can modify it inside `demo-server/templates-index-template.handlebars`. 

# Npm Module

This is a good choice if you already have a project and can just add this widget as a dependency. 
 
# Configuration
`authnWidget = new PfAuthnWidget(str baseUrl, obj params);`

* Configuration Parameters
  * baseUrl: full address of where PingFederate is running such as https://localhost:9031
  * divId where the widget should be rendered (Optional)
  * logo to display on top of every page (this can be passed in as form of file or url where the image is hosted)

* PingFederate Configuration
  * Enable Authentication Applications
  * Add an Authentication Application whose redirect uri is where this app will be hosted
  * Create a policy tree branch where the adapter will reside and attach the authentication application to the policy tree
  * Start SSO flow where you will get redirected to the app.       
  
* **Html Form Adapter** - All functionality of HTML form adapter such as
    - Login
    - Trouble Signing on
    - Trouble with User name
    - Password Reset


# Technical Notes
Handlebars templates are used for rendering the pages under `/partials` directory. CSS should be imported by default from CDN and any 
customization should be done under `/scss/` folder to overwrite the existing CSS.
### **Instantiate the Widget** 
Just add the following script to your applications onload function. 

        <script>
          var authnWidget = new PfAuthnWidget("https://localhost:9031", { divId: 'authnwidget' });
          authnWidget.init();
        </script>

Add a div where the widget should render as follows
        ```<div id="authnwidget" />```

The name of the div can be overwritten in the constructor under options.

### Customization
All handlebars templates can be customized for any formatting. There are a few things that should not be customized.
- `data-actionId` must match the actionId that is sent to PingFederate
- Form Ids in the handlebars templates must match what's being referenced in the index.js `FORM_ID`
       

### **Enabling Captcha**
In order to use Captcha with HTML form Adapter, we must import `api.js` from Google's CDN at `<script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script>`
Once the script is loaded, then we will instantiate the widget. Three functions are needed:

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

The widget should work with all major browsers including Chrome, Firefox, IE11 and IE Edge.

# Commands
- `npm install` - install the dependencies locally
- `npm run build` - build for production
- `npm run start` - start the dev server
- `npm run clean` - Remove `dist/` directory
- `npm test` - Run tests

# Bug Reports

Please use the issue tracker to report any bugs or file feature requests.


# License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
