import { Logger } from './logger';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
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