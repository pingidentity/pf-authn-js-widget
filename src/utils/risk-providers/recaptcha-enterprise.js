const LOG_PREFIX = '[reCAPTCHA Enterprise] ';

export default class RecaptchaEnterprise {
  constructor(attributes, store) {
    this.attributes = attributes;
    this.store = store;
    window.recaptchaEnterprise_loaded = window.recaptchaEnterprise_loaded || false;
    if (window.recaptchaEnterprise_loaded) {
      console.log(LOG_PREFIX + 'already initialized, skipping initialization');
      return;
    }
    window.recaptchaEnterprise_onload = () => {
      console.log(LOG_PREFIX + 'script onload event triggered');
      window.recaptchaEnterprise_loaded = true;
      renderCaptcha(this.attributes.siteKey);
    }
  }

  isLoaded() {
    return window.recaptchaEnterprise_loaded;
  }

  getScriptHeader() {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/enterprise.js?onload=recaptchaEnterprise_onload&render=explicit';
    script.setAttribute("async", "");
    script.setAttribute("defer", "");
    return script;
  }

  getUIElement() {
    return '<div id="invisibleRecaptchaId"></div>';
  }

  render() {
    // just render the captcha if script tag is loaded
    if (this.isLoaded()) {
      console.log(LOG_PREFIX + 'script is loaded.');
      renderCaptcha(this.attributes.siteKey);
      return;
    }

    // load the captcha script,
    // render will get triggered after the script is loaded
    console.log(LOG_PREFIX + 'loading script');
    document.head.appendChild(this.getScriptHeader());
    return;
  }

  execute(actionId, formData) {
    grecaptcha.enterprise.ready(() => {
      grecaptcha.enterprise.execute(window.recaptchaEnterprise_render_result, { action: this.attributes.action })
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

const renderCaptcha = (siteKey) => {
  console.log(LOG_PREFIX + 'rendering');
  window.recaptchaEnterprise_render_result = grecaptcha.enterprise.render('invisibleRecaptchaId', {
    'sitekey': `${siteKey}`,
    'size': 'invisible'
  });
}