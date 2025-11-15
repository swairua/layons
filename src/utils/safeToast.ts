import { toast as sonnerToast, ToastT } from 'sonner';

// Helper to safely format any value as a string for toast messages
const formatToastMessage = (message: unknown): string => {
  // Handle string first
  if (typeof message === 'string') {
    const trimmed = message.trim();
    if (trimmed && trimmed !== '[object Object]') {
      return trimmed;
    }
    return 'An error occurred';
  }

  // Handle Error instances
  if (message instanceof Error) {
    const msg = message.message?.trim() || '';
    return msg || 'An error occurred';
  }

  // Handle null/undefined
  if (typeof message === 'undefined' || message === null) {
    return 'An error occurred';
  }

  // Handle objects
  if (typeof message === 'object') {
    const obj = message as any;

    // Try to extract a meaningful message from the object
    if (obj.message && typeof obj.message === 'string') {
      const msg = obj.message.trim();
      if (msg && msg !== '[object Object]') {
        return msg;
      }
    }

    if (obj.error_description && typeof obj.error_description === 'string') {
      const msg = obj.error_description.trim();
      if (msg && msg !== '[object Object]') {
        return msg;
      }
    }

    if (obj.details && typeof obj.details === 'string') {
      const msg = obj.details.trim();
      if (msg && msg !== '[object Object]') {
        return msg;
      }
    }

    if (obj.hint && typeof obj.hint === 'string') {
      const msg = obj.hint.trim();
      if (msg && msg !== '[object Object]') {
        return msg;
      }
    }

    // Check for error name
    if (typeof obj.name === 'string' && obj.name.includes('Error')) {
      const msgPart = obj.message ? `: ${String(obj.message)}` : '';
      return `${obj.name}${msgPart}`;
    }

    // Last resort: try to stringify and check
    try {
      const stringified = String(message);
      if (stringified && stringified !== '[object Object]' && stringified !== 'null' && stringified !== 'undefined') {
        return stringified;
      }
    } catch (stringifyError) {
      // Continue to fallback
    }
  }

  // Final fallback
  return 'An unexpected error occurred';
};

// Safe wrapper around sonner toast that also sanitizes options
const sanitizeToastOptions = (options?: any): any => {
  if (!options) return options;

  const sanitized = { ...options };

  // Sanitize description if present
  if (sanitized.description) {
    sanitized.description = formatToastMessage(sanitized.description);
  }

  return sanitized;
};

// Safe wrapper around sonner toast
export const toast = {
  error: (message: unknown, options?: any): string | number => {
    return sonnerToast.error(formatToastMessage(message), sanitizeToastOptions(options)) as string | number;
  },
  success: (message: unknown, options?: any): string | number => {
    return sonnerToast.success(formatToastMessage(message), sanitizeToastOptions(options)) as string | number;
  },
  info: (message: unknown, options?: any): string | number => {
    return sonnerToast.info(formatToastMessage(message), sanitizeToastOptions(options)) as string | number;
  },
  warning: (message: unknown, options?: any): string | number => {
    return sonnerToast.warning(formatToastMessage(message), sanitizeToastOptions(options)) as string | number;
  },
  loading: (message: unknown, options?: any): string | number => {
    return sonnerToast.loading(formatToastMessage(message), sanitizeToastOptions(options)) as string | number;
  },
  custom: (message: unknown, options?: any): string | number => {
    return sonnerToast.custom(formatToastMessage(message), sanitizeToastOptions(options)) as string | number;
  },
  promise: (promise: any, messages: any, options?: any): string | number => {
    const formattedMessages = {
      loading: formatToastMessage(messages?.loading || 'Loading...'),
      success: formatToastMessage(messages?.success || 'Success!'),
      error: formatToastMessage(messages?.error || 'Error occurred'),
    };
    return sonnerToast.promise(promise, formattedMessages, sanitizeToastOptions(options)) as string | number;
  },
  dismiss: (toastId?: string | number): void => {
    sonnerToast.dismiss(toastId);
  },
};
