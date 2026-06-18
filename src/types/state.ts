export interface FlowState {
  status: 'RESUME' | 'COMPLETED' | 'FAILED' | 'PENDING';
  _links?: Record<string, { href: string }>;
  errorCode?: string;
  errorDetailCodes?: string[];
  userMessages?: Array<{ message: string; type: string }>;
  authorizeResponse?: Record<string, string>;
  // Catch-all for the many per-state dynamic fields from the PF server
  [key: string]: unknown;
}

export interface ActionModel {
  required?: string[];
  properties?: string[];
}

export type FormDataMap = Record<string, string | string[]>;
