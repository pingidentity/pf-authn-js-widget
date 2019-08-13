export function getCoreStates(dispatch) {
  return {
    'USERNAME_PASSWORD_REQUIRED': function() {
      document.getElementById("authn-widget-submit").addEventListener("click", dispatch);
    },
    'MUST_CHANGE_PASSWORD': () => {

    },
    'NEW_PASSWORD_RECOMMENDED': () => {

    },
    'NEW_PASSWORD_REQUIRED': () => {

    },
    'SUCCESSFUL_PASSWORD_CHANGE': () => {

    },
    'ACCOUNT_RECOVERY_USERNAME_REQUIRED': () => {

    },
    'ACCOUNT_RECOVERY_OTL_VERIFICATION_REQUIRED': () => {

    },
    'RECOVERY_CODE_REQUIRED': () => {

    },
    'PASSWORD_RESET_REQUIRED': () => {

    },
    'SUCCESSFUL_PASSWORD_RESET': () => {

    },
    'USERNAME_RECOVERY_EMAIL_REQUIRED': () => {

    },
    'USERNAME_RECOVERY_EMAIL_SENT': () => {

    },
    'SUCCESSFUL_ACCOUNT_UNLOCK': () => {

    },
    'IDENTIFIER_REQUIRED': () => {

    }
  }

}
