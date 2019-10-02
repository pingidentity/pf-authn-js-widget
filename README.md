# Pf-Authn-Widget 

PingFederate Authentication Widget is a javascript library that provides full capabilities of [HTML form Adapter](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=xvy1564003022890.html) via [Authentication APIs](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=qsl1564002999029.html) in a ready to use drop-in bundle along 
with CSS and customizable templates.

This provides an alternative solution to PingFederate templates which allows for a Single Page Application look and feel for the sign in experience.

The only information needed is Base URL of the PingFederate instance where it is configured to use [Authentication Applications](https://support.pingidentity.com/s/document-item?bundleId=pingfederate-93&topicId=ldc1564002999116.html).

The Authentication Application redirect URL must point to where you are hosting your SPA where the javascript library will run. 



# Installation

There are two ways to get the widget. You can build and install it locally on your development machine or get it as a node dependency.

# Build 

Before installing, make sure you have [node.js](https://nodejs.org/en/) installed. Check out this repository first.


This will kick off webpack dev server and instantiate your widget. If you need to modify the base url from `localhost:9031`, you can modify it inside `demo-server/templates-index-template.handlebars`. 

# Npm Module

This is a good choice if you already have a project and can just add this widget as a dependency. 
 
# Configuration
`authnWidget = new PfAuthnWidget("https://localhost:9031", {divId: 'authnwidget', logo: customLogo});`

* Configuration Parameters
  * baseUrl
  * divId where the widget should be rendered
  * logo to display on top of every page

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
          var authnWidget = new PfAuthnWidget("{{baseUrl}}", { divId: 'authnwidget' });
          authnWidget.init();
        </script>
        
### Customization
All handlebars templates can be customized for any formatting. There are a few things that should not be customized.
- `data-actionId` must match the actionId that is sent to PingFederate
- Form Ids in the handlebars templates must match what's being referenced in the index.js `FORM_ID`
-        

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

The widget should work with all major browsers including Chrome, Firefox and Internet Explorer 11 and above.

# Commands
- `npm install` - install the dependencies locally
- `npm run build` - build for production
- `npm run start` - start the dev server
- `npm run clean` - Remove `dist/` directory
- `npm test` - Run tests

# Bug Reports

Please use the issue tracker to report any bugs or file feature requests.


# License

This project is licensed under the MIT license. See the LICENSE file for more info.
