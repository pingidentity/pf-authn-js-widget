# Using PingOne Fraud Adapter with the Authentication Widget

Depending on your adapter configuration, you might need to take additional steps to use the Authentication Widget.

### System requirements and dependencies

* PingOne Fraud Management Integration Kit 1.0 or later

### Setup

1\. Add the following to your application's sign-on page.
* Copy the App ID, Client Secret, and Data collection endpoint URL from the PingOne Fraud dashboard and insert them for _<APP_ID>_, _<APP_SECRET>_, and _<ST_URL>_

```javascript
<!-- Enable below script integrating with Fraud IK -->
  <script id="stPingId" src="https://assets.pingone.com/p1f/web-sdk/4.2.0/p1f-sdk.js?appId=<APP_ID>"
  crossorigin="anonymous" defer>
  </script>

  <script>
     
        function onSecuredTouchReady(callback) {
            if (window["_securedTouchReady"]) {
                callback()
            } else {
                document.addEventListener("SecuredTouchReadyEvent", callback)
            }
        }

        function securedTouchInitLoad(userId, appSessionId) {
            onSecuredTouchReady(function() {
                _securedTouch.init({
	              url: "<ST_URL>",
                    appId: "<APP_ID>",
                    appSecret: "<APP_SECRET>",
                    userId: userId,
                    sessionId: appSessionId,
                    isDebugMode: false,
                    isSingleDomain: false,
                }).then(function() {
                    console.log("SecuredTouchSDK initialized successfully for sessionId: " + appSessionId);
                }).catch(function(e) {
                    console.error("An error occurred. Please check your init configuration", e)
                });         
            });
        }
```
2\. Where your web application initializes `PfAuthnWidget`, adjust _<FRAUD_CLIENT_PLATFORM>_ and _<FRAUD_CLIENT_VERSION>_ as appropriate to the application
```javascript
var authnWidget = new PfAuthnWidget('https://localhost:9031', { divId: 'authnwidget', fraudClientPlatform: <FRAUD_CLIENT_PLATFORM>, fraudClientVersion: <FRAUD_CLIENT_VERSION>, fraudClientSessionID: <FRAUD_CLIENT_SESSION_ID>});
authnWidget.init();
```
3\. Ensure that PingOne Fraud SDK is initialized by calling securedTouchInitLoad method upon load. PingOne Fraud requires client application to handle session id.
```javascript
  securedTouchInitLoad(null /* userId */, <FRAUD_CLIENT_SESSION_ID> /* appSessionId */);
```

4\. For registration flow use case,  update _postRegistrationRequired()_ method in _index.js_ to add tag to the username field configured in local identity profile registration flow template. 
```javascript
postRegistrationRequired() {
   this.store.registrationflow = true;
 
   // Uncomment two lines below and update the id to match element ID of username field //
   // var usernameElement = document.getElementById(<USERNAME_FIELD_ELEMENT_ID>);
   // usernameElement.setAttribute("data-st-field", 'username');
   // Example:
   // var usernameElement = document.getElementById('Email');
   // usernameElement.setAttribute("data-st-field", 'username');
 }
```