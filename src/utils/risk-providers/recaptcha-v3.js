const LOG_PREFIX = '[reCAPTCHA V3] ';

export default class RecaptchaV3 {
  constructor(attributes, store) {
    this.attributes = attributes;
    this.store = store;
    window.recaptchaV3_loaded = false;
  }

  isLoaded() {
    return window.recaptchaV3_loaded;
  }

  getScriptHeader() {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${this.attributes.siteKey}`;
    script.setAttribute("async", "");
    script.setAttribute("defer", "");
    script.onload = () => {
      console.log(LOG_PREFIX + 'triggering onload event');
      window.recaptchaV3_loaded = true;
    };
    return script;
  }

  getUIElement() {
    // recaptcha v3 doesn't need any UI elements.
    return '<div></div>';
  }

  render() {
    // just render the captcha if script tag is loaded
    if (this.isLoaded()) {
      console.log(LOG_PREFIX + 'script is loaded.');
      return;
    }

    // load the captcha script,
    // render will get triggered after the script is loaded
    console.log(LOG_PREFIX + 'loading script');
    document.head.appendChild(this.getScriptHeader());
    return;
  }

  execute(actionId, formData) {
    grecaptcha.ready(() => {
      grecaptcha.execute(this.attributes.siteKey, { action: this.attributes.action })
        .then((token) => {
          console.log(LOG_PREFIX + `captcha response: ${token}`);
          // add g-recaptcha-response to form data
          formData['captchaResponse'] = token;
          console.log(LOG_PREFIX + `${formData}`);
          this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
        });
    });
  }
}