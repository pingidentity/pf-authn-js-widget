const LOG_PREFIX = '[PingOne Protect Provider] ';

export default class Signals {
  constructor(attributes, store) {
    this.attributes = attributes;
    this.store = store;
    window.signalsSDK_loaded = this.isScriptInjected();
  }

  isLoaded() {
    return window.signalsSDK_loaded;
  }

  getScriptHeader() {
    const script = document.createElement('script');
    script.src = `https://apps.pingone.com/signals/web-sdk/5.2.7/signals-sdk.js`;
    script.onload = () => {
      console.log(LOG_PREFIX + 'triggering onload event');
      window.signalsSDK_loaded = true;
    };
    return script;
  }

  getUIElement() {
    // signals doesn't need any UI elements.
    return '<div></div>';
  }

  render() {
    // initialize the signals sdk when it's ready
    this.onSignalsSdkReady().then(() => window._pingOneSignals.init());

    // just render the captcha if script tag is loaded
    if (this.isLoaded()) {
      console.log(LOG_PREFIX + 'script is loaded.');
      return;
    }

    // load the captcha script,
    // render will get triggered after the script is loaded
    console.log(LOG_PREFIX + 'loading script');
    document.head.appendChild(this.getScriptHeader());
  }

  execute(actionId, formData) {
    this.onSignalsSdkReady()
      .then(() => window._pingOneSignals.init())
      .then(() => window._pingOneSignals.getData())
      .then(data => {
        // add signals data to form data
        formData['captchaResponse'] = data;
        this.store.dispatch('POST_FLOW', actionId, JSON.stringify(formData));
      });
  }

  isScriptInjected() {
    // check if the signal script is already loaded. if not, load it
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.includes('signals-sdk')) {
        return true;
      }
    }

    return false;
  }

  onSignalsSdkReady() {
    return new Promise(resolve => {
      if (window['_pingOneSignalsReady']) {
        resolve()
      } else {
        document.addEventListener('PingOneSignalsReadyEvent', resolve)
      }
    })
  }
}
