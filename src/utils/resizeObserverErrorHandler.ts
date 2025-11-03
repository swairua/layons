// Suppress ResizeObserver loop errors
// These are typically harmless and occur when observers trigger layout changes

let suppressResizeObserverLoopErrors = false;
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let originalOnError: ((this: GlobalEventHandlers, ev: ErrorEvent) => any) | null;

// Initialize suppression immediately when this module loads
const initializeErrorSuppression = () => {
  if (typeof window === 'undefined') return;

  const isResizeObserverError = (message: any): boolean => {
    const messageStr = String(message || '').toLowerCase();
    return (
      messageStr.includes('resizeobserver loop completed with undelivered notifications') ||
      messageStr.includes('resizeobserver loop limit exceeded') ||
      messageStr.includes('resizeobserver') && messageStr.includes('undelivered')
    );
  };

  // Store originals before overriding
  originalConsoleError = window.console.error;
  originalConsoleWarn = window.console.warn;
  originalOnError = window.onerror;

  // Override console.error
  window.console.error = function(...args) {
    if (args.length > 0 && isResizeObserverError(args[0])) {
      return;
    }
    originalConsoleError.apply(console, args as any);
  };

  // Override console.warn
  window.console.warn = function(...args) {
    if (args.length > 0 && isResizeObserverError(args[0])) {
      return;
    }
    originalConsoleWarn.apply(console, args as any);
  };

  // Override window.onerror
  window.onerror = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
    const messageStr = typeof message === 'string' ? message : String(message);
    if (isResizeObserverError(messageStr)) {
      return true; // Prevent default error handling
    }
    if (originalOnError && typeof originalOnError === 'function') {
      return originalOnError.call(window, message as any, source, lineno, colno, error);
    }
    return false;
  };

  // Handle error events (catch phase)
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isResizeObserverError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  // Handle message channel errors
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isResizeObserverError(event.error?.message)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  // Handle unhandled rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isResizeObserverError(event.reason)) {
      event.preventDefault();
    }
  });
};

// Initialize immediately when module loads
if (typeof window !== 'undefined') {
  initializeErrorSuppression();
}

export const enableResizeObserverErrorSuppression = () => {
  if (suppressResizeObserverLoopErrors) return;

  suppressResizeObserverLoopErrors = true;
  console.debug('ResizeObserver error suppression enabled');
};

export const disableResizeObserverErrorSuppression = () => {
  suppressResizeObserverLoopErrors = false;
  if (typeof window !== 'undefined' && originalConsoleError) {
    window.console.error = originalConsoleError;
    window.console.warn = originalConsoleWarn;
    window.onerror = originalOnError;
  }
};
