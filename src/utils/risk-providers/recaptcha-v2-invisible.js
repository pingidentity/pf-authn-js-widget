const LOG_PREFIX = '[reCAPTCHA V2 Invisible] '

export default class RecaptchaV2Invisible {
  constructor(attributes, store) {
    this.attributes = attributes;
    this.store = store;
    if (window.recaptchaV2Invisible_loaded) {
      // aleady loaded no need to register agian
      console.log(LOG_PREFIX + 'already initialized, skipping initialization')
      return;
    }
    window.recaptchaV2Invisible_loaded = false;
    window.recaptchaV2Invisible_onload = () => {
      console.log(LOG_PREFIX + 'script onload event triggered');
      window.recaptchaV2Invisible_loaded = true;
      renderCaptcha(this.attributes.siteKey, this.store);
    };
  }

  isLoaded() {
    return window.recaptchaV2Invisible_loaded;
  }

  getScriptHeader() {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaV2Invisible_onload&render=explicit';
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
      console.log(LOG_PREFIX + 'script is loaded, rendering');
      renderCaptcha(this.attributes.siteKey, this.store);
      return;
    }

    // load the captcha script,
    // render will get triggered after the script is loaded
    console.log(LOG_PREFIX + 'loading script')
    document.head.appendChild(this.getScriptHeader());
    return;
  }

  execute(actionId, formData) {
    this.store.savePendingState('POST_FLOW', actionId, formData);
    grecaptcha.execute();
  }
}

const renderCaptcha = (siteKey, store) => {
  grecaptcha.render('invisibleRecaptchaId', {
    'sitekey': `${siteKey}`,
    'badge': 'bottomright',
    'callback': () => {
      console.log(LOG_PREFIX + 'executing callback');
      const captchaResponse = grecaptcha.getResponse();
      if (captchaResponse.length === 0) {
        console.log(LOG_PREFIX + 'invalid response, try again.');
        store.clearPendingState();
      } else {
        console.log(LOG_PREFIX + `captcha response: ${captchaResponse}`);
        const extraPayload = {captchaResponse};
        store.dispatchPendingState(extraPayload);
      }
    },
    'size': 'invisible'
  });
}