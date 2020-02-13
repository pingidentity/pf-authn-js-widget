import pinglogo from '../assets/ping-logo.svg'

export default class Assets {

  constructor(options) {
    this.logo = (options && options.logo) || 'https://assets.pingone.com/ux/end-user/0.14.0/images/ping-logo.svg';
    this.error = (options && options.error) || 'https://assets.pingone.com/ux/end-user/0.13.0/icons/error.svg';
    this.spinner = (options && options.spinner) || 'https://assets.pingone.com/ux/end-user/0.13.0/icons/spinner.svg'
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
