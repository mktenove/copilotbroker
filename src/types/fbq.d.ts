interface FbqFunction {
  (action: 'init', pixelId: string): void;
  (action: 'track', event: string, params?: Record<string, unknown>): void;
  (action: 'trackCustom', event: string, params?: Record<string, unknown>): void;
}

declare global {
  interface Window {
    fbq: FbqFunction;
  }
}

export {};
