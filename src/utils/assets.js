
export default class Assets {

  constructor(options) {
    this.logo = options.logo || 'https://uilibrary.ping-eng.com/end-user/ping-logo.svg';
    this.error = options.error || 'https://uilibrary.ping-eng.com/end-user/error.svg';
  }

  toTemplateParams() {
    var result = {
      logo: this.logo,
      error: this.error
    }
    return result
  }
}
