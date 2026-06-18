import type { FormDataMap } from './state';

export interface RiskAttributes {
  siteKey?: string;
  action?: string;
}

export interface RiskProvider {
  getUIElement(): string;
  render(): void;
  execute(actionId: string, formData: FormDataMap): void;
}
