import AuthnWidget, { IAuthnWidget, IOptions, IRedirectlessConfig } from './index'

let options: IOptions = {
    divId: 'authnwidget',
    flowId: 'flowId',
    logo: 'logo',
    invokeReCaptcha: () => {},
    checkRecaptcha: 'checkRecaptcha',
    grecaptcha: {},
    useActionParam: true,
    deviceProfileScript: 'deviceProfileScript'
}

let config: IRedirectlessConfig = {
    client_id: 'id',
    response_type: 'response_type',
    onAuthorizationSuccess: (response: Response) => {},
}

let authnWidget: IAuthnWidget = new AuthnWidget("localhost", options);

if (config) {
    authnWidget.initRedirectless(config);
} else {
    authnWidget.init();
}
