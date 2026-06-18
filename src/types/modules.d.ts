// Ambient declarations for modules that lack @types packages

declare module '*.hbs' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

// query-string v7 ships its own types, nothing needed here

// riskPostRenderCallback — untyped local module
declare module '*/utils/callbacks/riskPostRenderCallback' {
  import type { FlowState } from '../types/state';
  import type Store from '../store';
  const captchaPostRenderCallback: (state: FlowState, store: Store) => void;
  export default captchaPostRenderCallback;
}
