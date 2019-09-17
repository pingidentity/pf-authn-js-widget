
export default class Assets {

  constructor(options) {
    this.logo = options.logo || 'https://uilibrary.ping-eng.com/end-user/ping-logo.svg';
    this.error = options.error || 'https://uilibrary.ping-eng.com/end-user/error.svg';
    this.spinner = options.spinner || 'https://uilibrary.ping-eng.com/end-user/spinner.svg'
  }

  toTemplateParams() {
    var result = {
      logo: this.logo,
      error: this.error,
      spinner: this.spinner
    }
    return result
  }
}
