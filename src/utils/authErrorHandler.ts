import { toast } from '@/utils/safeToast';
import { logError } from '@/utils/errorLogger';
import { parseErrorMessage } from '@/utils/errorHelpers';

export interface AuthErrorInfo {
  type: 'invalid_credentials' | 'email_not_confirmed' | 'network_error' | 'rate_limit' | 'server_error' | 'unknown';
  message: string;
  action?: string;
  retry?: boolean;
}

const NON_MEANINGFUL_MESSAGES = new Set(['', '[object object]', 'null', 'undefined']);

const sanitizeAuthMessage = (error: Error | any): string => {
  const candidates: string[] = [];

  if (error && typeof error === 'object') {
    const authError = error as any;
    if (typeof authError.message === 'string') {
      candidates.push(authError.message);
    }
    if (typeof authError.error_description === 'string') {
      candidates.push(authError.error_description);
    }
    if (typeof authError.details === 'string') {
      candidates.push(authError.details);
    }
    if (typeof authError.hint === 'string') {
      candidates.push(authError.hint);
    }
  }

  if (typeof error === 'string') {
    candidates.unshift(error);
  }

  const meaningfulCandidate = candidates.find(candidate => {
    const normalized = candidate?.trim().toLowerCase();
    return normalized && !NON_MEANINGFUL_MESSAGES.has(normalized);
  });

  if (meaningfulCandidate) {
    return meaningfulCandidate.trim();
  }

  const parsed = parseErrorMessage(error);
  const normalizedParsed = parsed.trim().toLowerCase();

  if (!NON_MEANINGFUL_MESSAGES.has(normalizedParsed)) {
    return parsed.trim();
  }

  return 'An unexpected authentication error occurred';
};

export function analyzeAuthError(error: Error | any): AuthErrorInfo {
  const errorMessage = sanitizeAuthMessage(error);
  const message = errorMessage.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return {
      type: 'invalid_credentials',
      message: 'Invalid email or password',
      action: 'Check your credentials or create an admin account using the setup above'
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      type: 'email_not_confirmed',
      message: 'Email address needs to be confirmed',
      action: 'Check your email for a confirmation link'
    };
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      type: 'network_error',
      message: 'Network connection error',
      action: 'Check your internet connection and try again',
      retry: true
    };
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return {
      type: 'rate_limit',
      message: 'Too many login attempts',
      action: 'Please wait a few minutes before trying again',
      retry: true
    };
  }

  if (message.includes('server') || message.includes('500')) {
    return {
      type: 'server_error',
      message: 'Server error occurred',
      action: 'Please try again in a few moments',
      retry: true
    };
  }

  const fallbackMessage = NON_MEANINGFUL_MESSAGES.has(message)
    ? 'An unexpected authentication error occurred'
    : errorMessage;

  // Ensure message is always a string
  const finalMessage = typeof fallbackMessage === 'string'
    ? fallbackMessage
    : 'An unexpected authentication error occurred';

  return {
    type: 'unknown',
    message: finalMessage,
    action: 'Please try again or contact support if the problem persists',
    retry: true
  };
}

export function handleAuthError(error: AuthError | Error): AuthErrorInfo {
  const errorInfo = analyzeAuthError(error);

  // Log for debugging using structured logger
  logError('Authentication error', error, { parsed: errorInfo });

  // Ensure the message is a string and not an object
  const messageToShow = typeof errorInfo.message === 'string'
    ? errorInfo.message
    : 'An unexpected authentication error occurred';

  const descriptionToShow = typeof errorInfo.action === 'string'
    ? errorInfo.action
    : undefined;

  // Show appropriate toast with guaranteed string values
  if (errorInfo.retry) {
    toast.error(messageToShow, {
      description: descriptionToShow,
      duration: 5000
    });
  } else {
    toast.error(messageToShow, {
      description: descriptionToShow,
      duration: 8000
    });
  }

  return errorInfo;
}

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'info@construction.com',
  password: 'Password123'
};

export function getAdminCredentialsHelp(): string {
  return `Default admin credentials:\nEmail: ${DEFAULT_ADMIN_CREDENTIALS.email}\nPassword: ${DEFAULT_ADMIN_CREDENTIALS.password}`;
}
