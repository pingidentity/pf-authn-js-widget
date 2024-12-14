# PingFederate Authentication API Agentless Integration

### Overview
You can modify the JavaScript Widget to allow the Agentless Integration Kit to work with the PingFederate Authentication API.

### System requirements and dependencies
* Agentless Integration Kit 2.0 or later
* An authentication service that is configured to drop off authenticated user attributes to PingFederate

### Setup

1. Modify the `reference_id_required.hbs` template to include the credential fields that your authentication service requires. The widget renders this handlebar template when it encounters the `REFERENCE_ID_REQUIRED` state.

1. Add to the `handleAgentlessSignOn(evt)` event handler, so it sends the user credentials to the authentication service. The event handler is triggered when the user submits the form on the template.

	The authentication service should validate the credentials, then drop off user attributes with PingFederate. PingFederate will provide it with a new reference ID (`REF`) that is associated with the attributes.
    
1. Add the following to send the new reference ID (`REF`) to PingFederate.

	```js
  	this.store.dispatch('POST_FLOW', 'checkReferenceId', "{json payload with referenceId}")
	```

	This completes the action and allows PingFederate to continue to the next part of the authentication policy. 

##### Getting the original reference ID
If the authentication service needs to retrieve the sign-on context from PingFederate, it will require the original reference ID (`REF`) associated with the current state. You can get this reference ID by calling `this.store.getStore().pickupReferenceId`.


##### Dropping off attributes
The drop-off endpoint (`/ext/ref/dropoff`) does not support CORS. The authentication service must drop off the user attributes with a back-channel call.


### Documentation

For the latest documentation, see [Agentless Integration Kit](https://docs.pingidentity.com/integrations/agentless/pf_agentless_ik.html) in the Ping Identity [Support Home](https://support.pingidentity.com)


### Sample applications

Ping Identity offers sample applications that let you test an integration with the Agentless Integration Kit. PingFederate acts as both the identity provider (IdP) and service provider (SP), showing the complete end-to-end configuration and user experience.

See the following for documentation and downloads:
* [Java Sample Applications](https://github.com/pingidentity/pf-agentless-ik-sample-java)
* [.NET Core Sample Applications](https://github.com/pingidentity/pf-agentless-ik-sample-dotnet-core)
* [PHP Sample Applications](https://github.com/pingidentity/pf-agentless-ik-sample-php)
* [Python Sample Applications](https://github.com/pingidentity/pf-agentless-ik-sample-python)
