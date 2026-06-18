import { initRedirectless, type RedirectlessConfig } from './utils/redirectless';
import FetchUtil from './utils/fetchUtil';
import type { FlowState } from './types/state';

interface StoreOptions {
  useActionParam?: boolean;
}

interface PendingState {
  method: string;
  actionId: string;
  payload: Record<string, unknown>;
}

type Listener = (prevState: FlowState, state: FlowState) => void;

export default class Store {
  listeners: Listener[];
  prevState: FlowState;
  state: FlowState;
  flowId: string;
  baseUrl: string;
  fetchUtil: FetchUtil;
  pendingState: Partial<PendingState>;
  securIdChallengeMethods?: string[];
  registrationflow: boolean;
  cookieless: boolean;
  stateHeader: string;

  constructor(flowId: string, baseUrl: string, options?: StoreOptions) {
    this.listeners = [];
    this.prevState = {} as FlowState;
    this.state = {} as FlowState;
    this.flowId = flowId;
    this.baseUrl = baseUrl;
    const useActionParam = (options && options.useActionParam) || false;
    this.fetchUtil = new FetchUtil(baseUrl, useActionParam);
    this.pendingState = {};
    this.registrationflow = false;
    this.cookieless = false;
    this.stateHeader = '';
  }

  setCookieless(flag: boolean): void {
    this.cookieless = flag;
  }

  setStateHeader(stateHeader: string): void {
    this.stateHeader = stateHeader;
  }

  getStore(): FlowState {
    return this.state;
  }

  getPreviousStore(): FlowState {
    return this.prevState;
  }

  async getState(): Promise<FlowState> {
    const result = await this.fetchUtil.getFlow(this.flowId, this.buildHeaders());
    return await result.json() as FlowState;
  }

  dispatchErrors(errors: unknown): void {
    (this.state as Record<string, unknown>).userMessages = errors;
    this.notifyListeners();
  }

  clearErrors(): void {
    delete (this.state as Record<string, unknown>).userMessages;
  }

  async dispatch(method: string, actionId?: string, payload?: string | RedirectlessConfig | null): Promise<void> {
    this.prevState = this.state;
    this.state = await this.reduce(method, actionId, payload);
    if ((this.prevState as Record<string, unknown>).username && !(this.state as Record<string, unknown>).username) {
      (this.state as Record<string, unknown>).username = (this.prevState as Record<string, unknown>).username;
    }
    console.log('dispatching actionId: ' + actionId);
    console.log(this.state);
    this.notifyListeners();
  }

  savePendingState(method: string, actionId: string, payload: Record<string, unknown>): void {
    this.pendingState = { method, actionId, payload };
  }

  dispatchPendingState(extraPayload: Record<string, unknown>): void {
    if (this.pendingState.method) {
      const payLoadString = JSON.stringify({ ...this.pendingState.payload, ...extraPayload });
      this.dispatch(this.pendingState.method, this.pendingState.actionId!, payLoadString);
      this.pendingState = {};
    }
  }

  clearPendingState(): void {
    this.pendingState = {};
  }

  async reduce(method: string, actionid?: string, payload?: string | RedirectlessConfig | null): Promise<FlowState> {
    this.prevState = this.state;
    let result: Response;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const spinnerEl = document.querySelector('#spinnerId') as HTMLElement | null;
    if (spinnerEl) {
      timeout = setTimeout(() => {
        (document.querySelector('#spinnerId') as HTMLElement).style.display = 'block';
        const formEl = document.querySelector('#AuthnWidgetForm') as HTMLElement | null;
        if (formEl) formEl.style.display = 'none';
        const errEl = document.querySelector('.feedback--error') as HTMLElement | null;
        if (errEl) errEl.style.display = 'none';
      }, 600);
    }

    switch (method) {
      case 'GET_FLOW':
        result = await this.fetchUtil.getFlow(this.flowId, this.buildHeaders());
        break;
      case 'INIT_REDIRECTLESS':
        result = await initRedirectless(this.baseUrl, payload as RedirectlessConfig);
        break;
      case 'POST_FLOW':
      default:
        result = await this.fetchUtil.postFlow(this.flowId, actionid ?? '', payload as string ?? null, this.buildHeaders());
        break;
    }

    const json = await result.json() as Record<string, unknown>;

    if (spinnerEl) {
      if (timeout) clearTimeout(timeout);
      (document.querySelector('#spinnerId') as HTMLElement).style.display = 'none';
      const formEl = document.querySelector('#AuthnWidgetForm') as HTMLElement | null;
      if (formEl) formEl.style.display = 'none';
    }

    let combinedData: Record<string, unknown> = { ...this.state as Record<string, unknown> };
    delete combinedData.userMessages;

    if (json.status) {
      this.flowId = json.id as string;
      combinedData = { ...json };
      this.state = json as unknown as FlowState;

      if (json.status === 'CANCELED') {
        const op = json.canceledOperation as string;
        switch (op) {
          case 'PASSWORD_CHANGE':
            this.state = { ...this.state, canceledTitle: 'Change Password', canceledMessage: 'You have cancelled the attempt to change your password. Please close this window. ' } as FlowState;
            break;
          case 'ACCOUNT_RECOVERY':
            this.state = { ...this.state, canceledTitle: 'Account Recovery', canceledMessage: 'You have cancelled the attempt to reset your password. Please close this window.' } as FlowState;
            break;
          case 'USERNAME_RECOVERY':
            this.state = { ...this.state, canceledTitle: 'Account Recovery ', canceledMessage: 'You have cancelled the attempt to retrieve your username. Please close this window.' } as FlowState;
            break;
        }
      } else if (json.status === 'FAILED') {
        const s = this.state as Record<string, unknown>;
        if (s.code && !s.userMessage) {
          s.userMessage = `The server returned "${s.code}" code. Please contact your system administrator.`;
        }
      } else if (json.status === 'ID_VERIFICATION_REQUIRED' || json.status === 'ID_VERIFICATION_OPTIONS') {
        const errors = this.getErrorDetails(json);
        delete combinedData.failedValidators;
        delete combinedData.satisfiedValidators;
        delete combinedData.userMessages;
        combinedData = { ...errors, ...this.state as Record<string, unknown> };
      } else if (json.status === 'OAUTH_DEVICE_USER_CODE_REQUIRED') {
        const errors = this.getErrorDetails(json);
        delete combinedData.authnError;
        delete combinedData.failedValidators;
        delete combinedData.satisfiedValidators;
        delete combinedData.userMessages;
        combinedData = { ...errors, ...this.state as Record<string, unknown> };
      }
    } else {
      if (json.code === 'RESOURCE_NOT_FOUND') {
        this.state = {} as FlowState;
      } else {
        const errors = this.getErrorDetails(json);
        delete combinedData.failedValidators;
        delete combinedData.satisfiedValidators;
        delete combinedData.userMessages;
        combinedData = { ...errors, ...this.state as Record<string, unknown> };
        if (json._pf_authn_api_state) {
          combinedData = { ...combinedData, _pf_authn_api_state: json._pf_authn_api_state };
        }
      }
    }

    let daysToExpireMsg: string | undefined;
    const daysToExpire = json.daysToExpire as number | undefined;
    if (daysToExpire !== undefined) {
      if (daysToExpire === 0) {
        daysToExpireMsg = 'today';
      } else if (daysToExpire === 1) {
        daysToExpireMsg = 'tomorrow';
      } else if (daysToExpire > 1) {
        daysToExpireMsg = 'in ' + daysToExpire + ' days';
      }
    }

    combinedData = { ...combinedData, daysToExpireMsg, actionid };
    return combinedData as unknown as FlowState;
  }

  getErrorDetails(json: Record<string, unknown>): Record<string, unknown> {
    const errors: Record<string, unknown> = {
      errorCode: '',
      errorDetailCodes: [],
      userMessages: [],
      failedValidators: [],
      satisfiedValidators: [],
    };

    if (json.code) {
      errors.errorCode = json.code;
      const details = json.details as Array<Record<string, unknown>> | undefined;
      if (details) {
        details.forEach(it => (errors.errorDetailCodes as string[]).push(it.code as string));
      }
    }

    const code = json.code as string | undefined;
    if (
      (code && code === 'VALIDATION_ERROR') ||
      code === 'REGISTRATION_FAILED' ||
      code === 'REQUEST_FAILED'
    ) {
      const details = json.details as Array<Record<string, unknown>> | undefined;
      if (details) {
        details.forEach(msg => {
          const failedValidators = msg.failedValidators as Array<Record<string, string>> | undefined;
          if (failedValidators) {
            failedValidators.map(v => v.userMessage).forEach(failMsg => (errors.failedValidators as string[]).push(failMsg));
          }
          const satisfiedValidators = msg.satisfiedValidators as Array<Record<string, string>> | undefined;
          if (satisfiedValidators) {
            satisfiedValidators.map(v => v.userMessage).forEach(okMsg => (errors.satisfiedValidators as string[]).push(okMsg));
          }
          let userMessage = msg.userMessage as string;
          if (msg.target) {
            userMessage = userMessage.slice(0, -1).concat(' : ').concat(msg.target as string);
          }
          if (!userMessage && msg.code) {
            userMessage = `Error code "${msg.code}" returned from the authorization server.`;
          }
          const attemptsRemaining = msg.attemptsRemaining as number | undefined;
          if (msg.code === 'INVALID_OTP' && attemptsRemaining) {
            userMessage += ' You have ' + attemptsRemaining + ' attempts remaining.';
          }
          (errors.userMessages as string[]).push(userMessage);
        });
      } else {
        errors.userMessages = json.userMessage;
      }
    } else if (code === 'RESOURCE_NOT_FOUND') {
      errors.userMessages = json.message;
    } else if (json.status === 'ID_VERIFICATION_REQUIRED') {
      const errorDetails = json.errorDetails as Array<Record<string, string>> | undefined;
      if (errorDetails) {
        errorDetails.forEach(msg => (errors.userMessages as string[]).push(msg.userMessage));
      }
    } else if (json.status === 'ID_VERIFICATION_OPTIONS') {
      if (json.errorMessage) {
        (errors.userMessages as string[]).push(json.errorMessage as string);
      }
    } else if (json.status === 'OAUTH_DEVICE_USER_CODE_REQUIRED') {
      const authnError = json.authnError as { details?: Array<Record<string, string>> } | undefined;
      if (authnError?.details) {
        authnError.details.forEach(detail => (errors.userMessages as string[]).push(detail.userMessage));
      }
    } else if (code === 'INVALID_DEVICE_TARGET') {
      if (json.message) {
        (errors.userMessages as string[]).push(json.message as string);
      }
    }

    return errors;
  }

  notifyListeners(): void {
    console.log('notifying # of listeners: ' + this.listeners.length);
    this.listeners.forEach(observer => observer(this.prevState, this.state));
  }

  registerListener(listener: Listener): void {
    this.listeners.push(listener);
    console.log('registering # of listeners: ' + this.listeners.length);
  }

  async poll(actionId = 'poll', body = '{}'): Promise<FlowState> {
    const result = await this.fetchUtil.postFlow(this.flowId, actionId, body, this.buildHeaders());
    return await result.json() as FlowState;
  }

  buildHeaders(): Map<string, string> {
    const headers = new Map<string, string>();
    if (this.cookieless) {
      headers.set(this.stateHeader, `${(this.state as Record<string, unknown>)._pf_authn_api_state}`);
    }
    return headers;
  }
}
