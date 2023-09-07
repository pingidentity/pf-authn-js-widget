import 'regenerator-runtime/runtime'; //for async await

function IsWebAuthnSupported() {
	if (!window.PublicKeyCredential) {
		console.log("Web Authentication API is not supported on this browser.");
		return false;
	}
	return true;
}

function isWebAuthnPlatformAuthenticatorAvailable() {
	var timer;
	var p1 = new Promise((resolve) => {
		timer = setTimeout(() => {
			resolve(false);
		}, 1000);
	});
	var p2 = new Promise((resolve) => {
		if (IsWebAuthnSupported() && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
			resolve(
				window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch((err) => {
					console.log(err);
					return false;
				}));
		}
		else {
			resolve(false);
		}
	});
	return Promise.race([p1, p2]).then((res) => {
		clearTimeout(timer);
		return res;
	});
}

function WebAuthnPlatformAuthentication(publicKeyCredentialRequestOptions) {
	return new Promise((resolve, reject) => {
		isWebAuthnPlatformAuthenticatorAvailable().then((result) => {
			if (result) {
				resolve(doWebAuthn());
			}
			reject(Error("UnSupportedBrowserError"));
		});
	});
}

export function doWebAuthn(authnWidget) {
	return new Promise((resolve, reject) => {
		let data = authnWidget.store.getStore();
		let options = data.publicKeyCredentialRequestOptions;
		let publicKeyCredential = {};
		publicKeyCredential.challenge = new Uint8Array(options.challenge);
		if ('allowCredentials' in options) {
			publicKeyCredential.allowCredentials = credentialListConversion(options.allowCredentials);
		}
		if ('rpId' in options) {
			publicKeyCredential.rpId = options.rpId;
		}
		if ('timeout' in options) {
			publicKeyCredential.timeout = options.timeout;
		}
		if ('userVerification' in options) {
			publicKeyCredential.userVerification = options.userVerification;
		}

		navigator.credentials.get({ "publicKey": publicKeyCredential })
			.then((assertion) => {
				// Send new credential info to server for verification and registration.
				let publicKeyCredential = {};
				if ('id' in assertion) {
					publicKeyCredential.id = assertion.id;
				}
				if ('rawId' in assertion) {
					publicKeyCredential.rawId = toBase64Str(assertion.rawId);
				}
				if ('type' in assertion) {
					publicKeyCredential.type = assertion.type;
				}
				let response = {};
				response.clientDataJSON = toBase64Str(assertion.response.clientDataJSON);
				response.authenticatorData = toBase64Str(assertion.response.authenticatorData);
				response.signature = toBase64Str(assertion.response.signature);
				response.userHandle = toBase64Str(assertion.response.userHandle);
				publicKeyCredential.response = response;
				resolve(JSON.stringify(publicKeyCredential));
				checkAssertion(JSON.stringify(publicKeyCredential), authnWidget);
			}).catch((err) => {
				// No acceptable authenticator or user refused consent. Cancel authentication
				// if this is the only device so we don't loop
				console.log("No acceptable authenticator or user refused consent");
				if (data.devices.length == 1) {
					// Hide back button and all other stuff. Only Cancel is allowed
					document.querySelector('#assertionRequiredSpinnerId').style.display = 'none';
					document.querySelector('#assertionRequiredAuthenticatingId').style.display = 'none';
					document.querySelector('#consentRefusedId').style.display = 'block';
					document.querySelector('#changeDevice').style.display = 'none';
					document.querySelector('#deviceInfoBlockId').style.display = 'none';
				}
				else {
					// Hide spinner and info section, show error so user can go back to device selection if required or cancel
					document.querySelector('#assertionRequiredSpinnerId').style.display = 'none';
					document.querySelector('#assertionRequiredAuthenticatingId').style.display = 'none';
					document.querySelector('#consentRefusedId').style.display = 'block';
				}
			});
	});
}

export function doRegisterWebAuthn(authnWidget, status) {
	var authAbortController = window.PublicKeyCredential ? new AbortController() : null;
	var authAbortSignal = window.PublicKeyCredential ? authAbortController.signal : null;
	return new Promise((resolve, reject) => {
		let data = authnWidget.store.getStore();
		let options = JSON.parse(data.publicKeyCredentialCreationOptions);
		let publicKeyCredential = {};
		publicKeyCredential.rp = options.rp;
		publicKeyCredential.user = options.user;
		publicKeyCredential.user.id = new Uint8Array(options.user.id);
		publicKeyCredential.challenge = new Uint8Array(options.challenge);
		publicKeyCredential.pubKeyCredParams = options.pubKeyCredParams;
		// Optional parameters
		if ('timeout' in options) {
			publicKeyCredential.timeout = options.timeout;
		}
		if ('excludeCredentials' in options) {
			publicKeyCredential.excludeCredentials = credentialListConversion(options.excludeCredentials);
		}
		if ('authenticatorSelection' in options) {
			publicKeyCredential.authenticatorSelection = options.authenticatorSelection;
		}
		if ('attestation' in options) {
			publicKeyCredential.attestation = options.attestation;
		}
		if ('extensions' in options) {
			publicKeyCredential.extensions = options.extensions;
		}

		navigator.credentials.create({ "publicKey": publicKeyCredential, "signal": authAbortSignal })
			.then(function (newCredentialInfo) {
				// Send new credential info to server for verification and registration.
				var publicKeyCredential = {};
				if ('id' in newCredentialInfo) {
					publicKeyCredential.id = newCredentialInfo.id;
				}
				if ('type' in newCredentialInfo) {
					publicKeyCredential.type = newCredentialInfo.type;
				}
				if ('rawId' in newCredentialInfo) {
					publicKeyCredential.rawId = toBase64Str(newCredentialInfo.rawId);
				}
				if (!newCredentialInfo.response) {
					throw "Missing 'response' attribute in credential response";
				}
				var response = {};
				response.clientDataJSON = toBase64Str(newCredentialInfo.response.clientDataJSON);
				response.attestationObject = toBase64Str(newCredentialInfo.response.attestationObject);
				publicKeyCredential.response = response;
				resolve(JSON.stringify(publicKeyCredential));
				if (status === 'PLATFORM_ACTIVATION_REQUIRED')
					activateFIDODevice(JSON.stringify(publicKeyCredential), authnWidget, 'PLATFORM');
				else if (status === 'SECURITY_KEY_ACTIVATION_REQUIRED')
          activateFIDODevice(JSON.stringify(publicKeyCredential), authnWidget, 'SECURITY_KEY');
        else
					activateFIDODevice(JSON.stringify(publicKeyCredential), authnWidget, 'FIDO2');

			}).catch(function (err) {
				// No acceptable authenticator or user refused consent. Handle appropriately.
				console.log(err);
				document.querySelector('#platform_icon_container_id').style.display = 'none';
				document.querySelector('#attestationRequiredId').style.display = 'none';
				document.querySelector('#unsupportedDeviceId').style.display = 'none';
				document.querySelector('#consentRefusedId').style.display = 'block';
			});
	});
}


function credentialListConversion(list) {
	var credList = [];
	for (var i = 0; i < list.length; i++) {
		var cred = {
			type: list[i].type,
			id: new Uint8Array(list[i].id)
		};
		if (list[i].transports) {
			cred.transports = list[i].transports;
		}
		credList.push(cred);
	}
	return credList;
}

function toBase64Str(bin) {
	return btoa(String.fromCharCode.apply(null, new Uint8Array(bin)));
}

var isWebAuthnSupported = () => {
	if (!window.PublicKeyCredential) {
		return false;
	}
	return true;
};

export function getCompatibility() {
	return isWebAuthnPlatformAuthenticatorAvailable()
		.then((result) => {
			if (result) {
				return 'FULL';
			} else if (isWebAuthnSupported()) {
				return 'SECURITY_KEY_ONLY';
			} else {
				return 'NONE';
			}
		})
		.catch(() => {
			if (isWebAuthnSupported()) {
				return 'SECURITY_KEY_ONLY';
			} else {
				return 'NONE';
			}
		});
}

function checkAssertion(publicKeyCredential, authnWidget) {
	document.querySelector('#assertion').value = publicKeyCredential;
	getCompatibility().then((value) => {
		if (value === 'FULL')
			document.querySelector('#compatibility').value = 'FULL';
		else if (value === 'SECURITY_KEY_ONLY')
			document.querySelector('#compatibility').value = 'SECURITY_KEY_ONLY';
		else
			document.querySelector('#compatibility').value = 'NONE';

		document.querySelector('#origin').value = window.location.origin; // Origin
		let formData = authnWidget.getFormData();
		authnWidget.store.dispatch('POST_FLOW', "checkAssertion", JSON.stringify(formData));
	});
}

function activateFIDODevice(publicKeyCredential, authnWidget, deviceType) {
	document.querySelector('#attestation').value = publicKeyCredential;
	document.querySelector('#origin').value = window.location.origin; // Origin
	let formData = authnWidget.getFormData();
	if (deviceType === 'PLATFORM')
	{
		authnWidget.store.dispatch('POST_FLOW', "activatePlatformDevice", JSON.stringify(formData));
	}
	else if (deviceType === 'SECURITY_KEY')
  {
		authnWidget.store.dispatch('POST_FLOW', "activateSecurityKeyDevice", JSON.stringify(formData));
	}
  else{
    authnWidget.store.dispatch('POST_FLOW', "activateFido2Device", JSON.stringify(formData));
  }

}