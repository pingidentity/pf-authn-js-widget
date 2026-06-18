interface AssetsOptions {
  logo?: string;
}

export default class Assets {
  logo: string;

  constructor(options?: AssetsOptions) {
    this.logo = (options && options.logo) || 'https://assets.pingone.com/ux/ui-library/5.6.11/images/logo-pingidentity.png';
  }

  toTemplateParams(): { logo: string } {
    return { logo: this.logo };
  }
}
