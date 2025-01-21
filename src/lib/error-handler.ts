import { toast } from '@/hooks/use-toast';
import type { ToastProps } from '@/components/ui/toast';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  NetworkError,
  ValidationError,
  SecurityError,
  isAppError,
  isRetryable,
  isNetworkError
} from '@/lib/utils/errors';

// Toast options type
type ToasterToast = ToastProps & {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

// User-safe error messages
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VALIDATION]: 'The provided input is invalid',
  [ErrorType.NETWORK]: 'Unable to connect. Please check your connection',
  [ErrorType.AUTH]: 'Please sign in to continue',
  [ErrorType.DATABASE]: 'Unable to process request',
  [ErrorType.NOT_FOUND]: 'The requested item was not found',
  [ErrorType.PERMISSION]: 'Access denied',
  [ErrorType.WORKFLOW]: 'Invalid operation for current status',
  [ErrorType.TEAM]: 'Team operation failed',
  [ErrorType.RATE_LIMIT]: 'Too many requests. Please try again later',
  [ErrorType.SECURITY]: 'Security check failed',
  [ErrorType.CONFIG]: 'System configuration error',
  [ErrorType.RETRYABLE]: 'Operation failed, please try again',
  [ErrorType.UNKNOWN]: 'An error occurred'
};

// Rate limiting for retries
class RateLimiter {
  private attempts: Map<string, number> = new Map();
  private timestamps: Map<string, number> = new Map();
  private readonly maxAttempts = 5;
  private readonly timeWindow = 60000; // 1 minute

  canRetry(key: string): boolean {
    const now = Date.now();
    const lastAttempt = this.timestamps.get(key) || 0;
    const attempts = this.attempts.get(key) || 0;

    // Reset if outside time window
    if (now - lastAttempt > this.timeWindow) {
      this.attempts.delete(key);
      this.timestamps.delete(key);
      return true;
    }

    return attempts < this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const attempts = (this.attempts.get(key) || 0) + 1;
    this.attempts.set(key, attempts);
    this.timestamps.set(key, Date.now());
  }
}

const rateLimiter = new RateLimiter();

// Create rate-limited retry function
function createRateLimitedRetry() {
  const retryKey = Date.now().toString();
  
  return async function rateLimitedRetry(): Promise<never> {
    if (!rateLimiter.canRetry(retryKey)) {
      throw new SecurityError(
        ERROR_MESSAGES[ErrorType.RATE_LIMIT]
      );
    }
    
    rateLimiter.recordAttempt(retryKey);
    throw new Error('Retry not implemented');
  };
}

// Error handler function with improved security
export function handleError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Handle Supabase errors
    if ('code' in error && typeof error.code === 'string') {
      if (error.code.startsWith('PGRST')) {
        return new SecurityError(
          ERROR_MESSAGES[ErrorType.PERMISSION],
          { code: error.code }
        );
      }
      return new AppError(
        ERROR_MESSAGES[ErrorType.DATABASE],
        ErrorType.DATABASE,
        ErrorSeverity.ERROR,
        error.code
      );
    }

    // Handle network errors with rate limiting
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return new NetworkError(
        ERROR_MESSAGES[ErrorType.NETWORK],
        createRateLimitedRetry()
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return new ValidationError(
        ERROR_MESSAGES[ErrorType.VALIDATION]
      );
    }

    return new AppError(
      ERROR_MESSAGES[ErrorType.UNKNOWN],
      ErrorType.UNKNOWN,
      ErrorSeverity.ERROR
    );
  }

  return new AppError(
    ERROR_MESSAGES[ErrorType.UNKNOWN],
    ErrorType.UNKNOWN,
    ErrorSeverity.ERROR
  );
}

// Toast error handler with improved security
export function showErrorToast(error: unknown): AppError {
  const appError = handleError(error);
  
  const toastOptions: ToasterToast = {
    title: ERROR_MESSAGES[appError.type],
    description: appError.message,
    variant: appError.severity === ErrorSeverity.CRITICAL ? 'destructive' : 'default',
  };

  if ((isRetryable(appError) || isNetworkError(appError)) && appError.retry) {
    // Show retry message in description
    toastOptions.description = `${toastOptions.description}. Click to retry.`;
    toast({
      ...toastOptions,
      onClick: () => appError.retry?.()
    });
  } else {
    toast(toastOptions);
  }

  return appError;
}

// Async error wrapper with exponential backoff
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    showToast?: boolean;
    rethrow?: boolean;
    maxRetries?: number;
    baseDelay?: number;
  } = {}
): Promise<T> {
  const {
    showToast = true,
    rethrow = false,
    maxRetries = 3,
    baseDelay = 1000
  } = options;

  let attempts = 0;

  const attempt = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      const appError = handleError(error);
      
      const shouldRetry = 
        attempts < maxRetries &&
        (isNetworkError(appError) || isRetryable(appError));

      if (shouldRetry) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempts - 1) + Math.random() * 1000,
          30000 // Max 30 seconds
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt();
      }
      
      if (showToast) {
        showErrorToast(appError);
      }
      
      if (rethrow) {
        throw appError;
      }
      
      return Promise.reject(appError);
    }
  };

  return attempt();
}