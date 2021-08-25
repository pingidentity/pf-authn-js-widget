import AuthnWidget, { IAuthnWidget, IOptions, IRedirectlessConfig } from './index'

var options: IOptions = {
    divId: 'authnwidget',
    flowId: 'flowId',
    logo: 'logo',
    invokeReCaptcha: () => {},
    checkRecaptcha: 'checkRecaptcha',
    grecaptcha: {},
    useActionParam: true,
    deviceProfileScript: 'deviceProfileScript'
}

var config: IRedirectlessConfig = {
    client_id: 'id',
    response_type: 'response_type',
    onAuthorizationSuccess: (response: Response) => {},
}

var authnWidget: IAuthnWidget = new AuthnWidget("localhost", options);

if (config) {
    authnWidget.initRedirectless(config);
} else {
    authnWidget.init();
}
