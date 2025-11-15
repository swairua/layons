import { toast as sonnerToast, ToastT } from 'sonner';

// Helper to safely format any value as a string for toast messages
const formatToastMessage = (message: unknown): string => {
  if (typeof message === 'string') {
    return message;
  }
  
  if (message instanceof Error) {
    return message.message || 'An error occurred';
  }
  
  if (message && typeof message === 'object') {
    const obj = message as any;
    // Try to extract a meaningful message from the object
    if (obj.message && typeof obj.message === 'string') {
      return obj.message;
    }
    if (obj.error_description && typeof obj.error_description === 'string') {
      return obj.error_description;
    }
    if (obj.details && typeof obj.details === 'string') {
      return obj.details;
    }
    if (obj.hint && typeof obj.hint === 'string') {
      return obj.hint;
    }
    // If none of the above work, check if it's an Auth Error
    if (typeof obj.name === 'string' && obj.name.includes('Error')) {
      return `${obj.name}: ${obj.message || 'An error occurred'}`;
    }
  }
  
  if (typeof message === 'undefined' || message === null) {
    return 'An error occurred';
  }
  
  const stringified = String(message);
  // Prevent displaying [object Object]
  if (stringified === '[object Object]') {
    return 'An unexpected error occurred';
  }
  
  return stringified;
};

// Safe wrapper around sonner toast
export const toast = {
  error: (message: unknown, options?: any): string | number => {
    return sonnerToast.error(formatToastMessage(message), options) as string | number;
  },
  success: (message: unknown, options?: any): string | number => {
    return sonnerToast.success(formatToastMessage(message), options) as string | number;
  },
  info: (message: unknown, options?: any): string | number => {
    return sonnerToast.info(formatToastMessage(message), options) as string | number;
  },
  warning: (message: unknown, options?: any): string | number => {
    return sonnerToast.warning(formatToastMessage(message), options) as string | number;
  },
  loading: (message: unknown, options?: any): string | number => {
    return sonnerToast.loading(formatToastMessage(message), options) as string | number;
  },
  custom: (message: unknown, options?: any): string | number => {
    return sonnerToast.custom(formatToastMessage(message), options) as string | number;
  },
  promise: (promise: any, messages: any, options?: any): string | number => {
    const formattedMessages = {
      loading: formatToastMessage(messages?.loading || 'Loading...'),
      success: formatToastMessage(messages?.success || 'Success!'),
      error: formatToastMessage(messages?.error || 'Error occurred'),
    };
    return sonnerToast.promise(promise, formattedMessages, options) as string | number;
  },
  dismiss: (toastId?: string | number): void => {
    sonnerToast.dismiss(toastId);
  },
};
