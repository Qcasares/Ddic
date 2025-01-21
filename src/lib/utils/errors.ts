import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { handleError, showErrorToast, withErrorHandling } from '../error-handler';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  NetworkError,
  ValidationError,
  SecurityError,
  isAppError,
  isNetworkError,
  isRetryable
} from '../utils/errors';
import { toast } from '@/hooks/use-toast';

// Mock the toast function
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should return the same error if already an AppError', () => {
      const originalError = new AppError('Test error', ErrorType.UNKNOWN);
      const handledError = handleError(originalError);
      expect(handledError).toBe(originalError);
    });

    it('should handle Supabase authentication errors', () => {
      const error = new Error('Unauthorized');
      (error as any).code = 'PGRST301';
      
      const handledError = handleError(error);
      expect(handledError).toBeInstanceOf(SecurityError);
      expect(handledError.type).toBe(ErrorType.PERMISSION);
    });

    it('should handle network errors with retry capability', () => {
      const error = new Error('Failed to fetch');
      error.name = 'NetworkError';
      
      const handledError = handleError(error);
      expect(handledError).toBeInstanceOf(NetworkError);
      expect(handledError.retry).toBeDefined();
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid input');
      error.name = 'ValidationError';
      
      const handledError = handleError(error);
      expect(handledError).toBeInstanceOf(ValidationError);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      const handledError = handleError(error);
      expect(handledError.type).toBe(ErrorType.UNKNOWN);
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Not an Error instance' };
      const handledError = handleError(error);
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('showErrorToast', () => {
    it('should show toast with error message', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION);
      showErrorToast(error);
      
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.any(String),
        description: error.message,
        variant: 'default'
      }));
    });

    it('should show destructive toast for critical errors', () => {
      const error = new AppError(
        'Critical error',
        ErrorType.SECURITY,
        ErrorSeverity.CRITICAL
      );
      showErrorToast(error);
      
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive'
      }));
    });

    it('should add retry option for retryable errors', () => {
      const retryFn = jest.fn();
      const error = new NetworkError('Network error', retryFn);
      showErrorToast(error);
      
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        description: expect.stringContaining('Click to retry'),
        onClick: expect.any(Function)
      }));
    });
  });

  describe('withErrorHandling', () => {
    it('should return result for successful operation', async () => {
      const result = 'success';
      const operation = jest.fn().mockResolvedValue(result);
      
      const handled = await withErrorHandling(operation);
      expect(handled).toBe(result);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry network errors', async () => {
      const error = new NetworkError('Network error');
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      
      const handled = await withErrorHandling(operation);
      expect(handled).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect max retries', async () => {
      const error = new NetworkError('Network error');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withErrorHandling(operation, { maxRetries: 2 }))
        .rejects
        .toThrow();
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should show toast when configured', async () => {
      const error = new AppError('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withErrorHandling(operation, { showToast: true }))
        .rejects
        .toThrow();
      expect(toast).toHaveBeenCalled();
    });

    it('should not show toast when disabled', async () => {
      const error = new AppError('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withErrorHandling(operation, { showToast: false }))
        .rejects
        .toThrow();
      expect(toast).not.toHaveBeenCalled();
    });

    it('should rethrow error when configured', async () => {
      const error = new AppError('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withErrorHandling(operation, { rethrow: true }))
        .rejects
        .toBe(error);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify AppErrors', () => {
      const error = new AppError('Test error');
      expect(isAppError(error)).toBe(true);
      expect(isAppError(new Error())).toBe(false);
    });

    it('should correctly identify NetworkErrors', () => {
      const error = new NetworkError('Network error');
      expect(isNetworkError(error)).toBe(true);
      expect(isNetworkError(new Error())).toBe(false);
    });

    it('should correctly identify RetryableErrors', () => {
      const error = new NetworkError('Network error', jest.fn());
      expect(isRetryable(error)).toBe(true);
      expect(isRetryable(new AppError('Test error'))).toBe(false);
    });
  });
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Error types for application-specific errors
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION_ERROR',
  WORKFLOW = 'WORKFLOW_ERROR',
  TEAM = 'TEAM_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  SECURITY = 'SECURITY_ERROR',
  CONFIG = 'CONFIG_ERROR',
  RETRYABLE = 'RETRYABLE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Error context type
 */
interface ErrorContext {
  type: ErrorType;
  severity: ErrorSeverity;
  timestamp: string;
  code?: string;
  details?: unknown;
}

/**
 * Sanitize error message to prevent XSS
 */
function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/[{}]/g, '') // Remove potential template literals
    .substring(0, 150);    // Limit length
}

/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  private readonly logger: Logger;
  private readonly timestamp: string;
  public readonly context: ErrorContext;

  constructor(
    message: string,
    public readonly type: ErrorType = ErrorType.UNKNOWN,
    public readonly severity: ErrorSeverity = ErrorSeverity.ERROR,
    public readonly code?: string,
    details?: unknown,
    public readonly retry?: () => Promise<unknown>
  ) {
    super(sanitizeErrorMessage(message));
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.logger = Logger.getInstance();
    
    this.context = {
      type,
      severity,
      timestamp: this.timestamp,
      code,
      details: this.sanitizeDetails(details)
    };

    Error.captureStackTrace(this, this.constructor);
    this.logError();
  }

  private logError(): void {
    this.logger.error(this.message, this);
  }

  private sanitizeDetails(details: unknown): unknown {
    if (!details) return undefined;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    if (typeof details === 'object') {
      return Object.entries(details as Record<string, unknown>)
        .filter(([key]) => !sensitiveFields.includes(key.toLowerCase()))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    }
    return details;
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      timestamp: this.timestamp,
      details: this.context.details
    };
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorType.DATABASE,
      ErrorSeverity.ERROR,
      'DB_ERROR',
      details
    );
  }
}

/**
 * Validation errors for input data
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.WARNING,
      'VALIDATION_ERROR',
      details
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorType.CONFIG,
      ErrorSeverity.CRITICAL,
      'CONFIG_ERROR',
      details
    );
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorType.NOT_FOUND,
      ErrorSeverity.WARNING,
      'NOT_FOUND',
      details
    );
  }
}

/**
 * Process failed but can be retried
 */
export class RetryableError extends AppError {
  constructor(
    message: string,
    retryFn: () => Promise<unknown>,
    details?: unknown
  ) {
    super(
      message,
      ErrorType.RETRYABLE,
      ErrorSeverity.WARNING,
      'RETRYABLE_ERROR',
      details,
      retryFn
    );
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(message: string, retryFn?: () => Promise<unknown>, details?: unknown) {
    super(
      message,
      ErrorType.NETWORK,
      ErrorSeverity.ERROR,
      'NETWORK_ERROR',
      details,
      retryFn
    );
  }
}

/**
 * Security-related errors
 */
export class SecurityError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorType.SECURITY,
      ErrorSeverity.CRITICAL,
      'SECURITY_ERROR',
      details
    );
  }
}

/**
 * Error type guards
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const isDatabaseError = (error: unknown): error is DatabaseError => {
  return error instanceof DatabaseError;
};

export const isRetryable = (error: unknown): error is RetryableError => {
  return error instanceof RetryableError || 
    (error instanceof AppError && error.type === ErrorType.RETRYABLE);
};

export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError ||
    (error instanceof AppError && error.type === ErrorType.NETWORK);
};

export const isSecurityError = (error: unknown): error is SecurityError => {
  return error instanceof SecurityError ||
    (error instanceof AppError && error.type === ErrorType.SECURITY);
};
