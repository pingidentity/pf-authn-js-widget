
export default class Assets {

  constructor(options) {
    this.logo = (options && options.logo) || 'https://assets.pingone.com/ux/ui-library/5.6.11/images/logo-pingidentity.png';
  }

  toTemplateParams() {
    var result = {
      logo: this.logo,
    }
    return result
  }
}
