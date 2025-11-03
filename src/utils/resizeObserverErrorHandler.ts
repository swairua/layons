// Suppress ResizeObserver loop errors
// These are typically harmless and occur when observers trigger layout changes
// They appear as browser warnings but don't affect functionality

let suppressionEnabled = false;
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let originalConsoleDebug: typeof console.debug;
let originalOnError: ((this: GlobalEventHandlers, ev: ErrorEvent) => any) | null;

// Detect ResizeObserver errors in any message format
const isResizeObserverError = (message: any): boolean => {
  if (!message) return false;

  const messageStr = String(message || '').toLowerCase();
  return (
    messageStr.includes('resizeobserver loop completed with undelivered notifications') ||
    messageStr.includes('resizeobserver loop limit exceeded') ||
    messageStr.includes('resizeobserver') && (
      messageStr.includes('undelivered') ||
      messageStr.includes('loop') ||
      messageStr.includes('error')
    )
  );
};

// Initialize suppression immediately when this module loads
const initializeErrorSuppression = () => {
  if (typeof window === 'undefined' || suppressionEnabled) return;

  suppressionEnabled = true;

  // Store originals before overriding
  originalConsoleError = window.console.error;
  originalConsoleWarn = window.console.warn;
  originalConsoleDebug = window.console.debug;
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

  // Also suppress ResizeObserver warnings that might use console.debug
  window.console.debug = function(...args) {
    if (args.length > 0 && isResizeObserverError(args[0])) {
      return;
    }
    originalConsoleDebug.apply(console, args as any);
  };

  // Override window.onerror
  window.onerror = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
    const messageStr = typeof message === 'string' ? message : String(message);
    if (isResizeObserverError(messageStr)) {
      return true; // Prevent default error handling
    }
    if (error && isResizeObserverError(error.message)) {
      return true;
    }
    if (originalOnError && typeof originalOnError === 'function') {
      return originalOnError.call(window, message as any, source, lineno, colno, error);
    }
    return false;
  };

  // Handle error events (capture phase)
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isResizeObserverError(event.message) || isResizeObserverError(event.error?.message)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  // Handle error events (bubble phase) - some errors bubble up
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isResizeObserverError(event.message) || isResizeObserverError(event.error?.message)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, false);

  // Handle unhandled rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isResizeObserverError(event.reason) || isResizeObserverError(event.reason?.message)) {
      event.preventDefault();
    }
  });
};

// Initialize immediately when module loads
if (typeof window !== 'undefined') {
  initializeErrorSuppression();
}

export const enableResizeObserverErrorSuppression = () => {
  if (suppressionEnabled) return;
  initializeErrorSuppression();
};

export const disableResizeObserverErrorSuppression = () => {
  suppressionEnabled = false;
  if (typeof window !== 'undefined' && originalConsoleError) {
    window.console.error = originalConsoleError;
    window.console.warn = originalConsoleWarn;
    window.console.debug = originalConsoleDebug;
    window.onerror = originalOnError;
  }
};
