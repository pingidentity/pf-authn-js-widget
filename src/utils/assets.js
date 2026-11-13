
export default class Assets {

  constructor(options) {
    this.logo = (options && options.logo) || 'https://assets.pingone.com/ux/ui-library/5.6.11/images/logo-pingidentity.png';
    // P14C-88164: target application name displayed on authentication screens.
    // Two sources: the widget option (embed-level override) or the
    // targetApplicationName field the IK now returns on the OTP_REQUIRED /
    // PUSH_CONFIRMATION_WAITING / PUSH_CONFIRMATION_TIMED_OUT state models.
    // Left undefined when the option is absent so the state value survives the
    // Object.assign(state, derivedFlags, assetsParams) merge in render().
    this.targetApplicationName = (options && options.targetApplicationName) || undefined;
  }

  toTemplateParams() {
    var result = {
      logo: this.logo,
    }
    if (this.targetApplicationName) {
      result.targetApplicationName = this.targetApplicationName;
    }
    return result
  }
}

