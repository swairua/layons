// Safe ResizeObserver utility that prevents loops and handles errors gracefully

interface SafeResizeObserverCallback {
  (entries: ResizeObserverEntry[]): void;
}

export class SafeResizeObserver {
  private observer: ResizeObserver | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private animationFrameId: number | null = null;
  private isObserving = false;
  private debounceMs: number;
  private callback: SafeResizeObserverCallback;
  private loopCounter = 0;
  private loopResetTime = Date.now();
  private lastEntries: ResizeObserverEntry[] = [];

  constructor(callback: SafeResizeObserverCallback, debounceMs = 250) {
    this.callback = callback;
    this.debounceMs = debounceMs;

    try {
      this.observer = new ResizeObserver((entries) => {
        this.handleResize(entries);
      });
    } catch (error) {
      console.debug('ResizeObserver not supported, falling back gracefully');
      this.observer = null;
    }
  }

  private handleResize = (entries: ResizeObserverEntry[]) => {
    // Clear any pending callbacks
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Track rapid resize events to detect and prevent loops
    const now = Date.now();
    if (now - this.loopResetTime > 1000) {
      this.loopCounter = 0;
      this.loopResetTime = now;
    }
    this.loopCounter++;

    // If too many resize events in a short time, disconnect to prevent loop
    if (this.loopCounter > 15) {
      this.disconnect();
      return;
    }

    // Store entries for comparison
    this.lastEntries = entries;

    // Debounce the callback to prevent loops
    this.timeoutId = setTimeout(() => {
      try {
        // Use requestAnimationFrame to ensure we're not in a layout cycle
        this.animationFrameId = requestAnimationFrame(() => {
          try {
            this.callback(this.lastEntries);
          } catch (error) {
            console.debug('ResizeObserver callback error:', error);
          }
        });
      } catch (error) {
        console.debug('ResizeObserver animation frame error:', error);
      }
    }, this.debounceMs);
  };

  observe(target: Element): void {
    if (!this.observer || this.isObserving) return;

    try {
      this.loopCounter = 0;
      this.loopResetTime = Date.now();
      this.observer.observe(target);
      this.isObserving = true;
    } catch (error) {
      console.debug('Failed to observe element:', error);
    }
  }

  unobserve(target: Element): void {
    if (!this.observer) return;

    try {
      this.observer.unobserve(target);
      this.isObserving = false;
    } catch (error) {
      console.debug('Failed to unobserve element:', error);
    }
  }

  disconnect(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.observer) {
      try {
        this.observer.disconnect();
        this.isObserving = false;
      } catch (error) {
        console.debug('Failed to disconnect observer:', error);
      }
    }
  }
}

// Convenience function to create a safe ResizeObserver
export const createSafeResizeObserver = (
  callback: SafeResizeObserverCallback,
  debounceMs = 250
): SafeResizeObserver => {
  return new SafeResizeObserver(callback, debounceMs);
};
