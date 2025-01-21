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

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export class AppError extends Error {
  constructor(
    public message: string,
    public type: ErrorType,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public code?: string,
    public retry?: () => Promise<never>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, retry?: () => Promise<never>) {
    super(message, ErrorType.NETWORK, ErrorSeverity.ERROR, undefined, retry);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.VALIDATION);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends AppError {
  constructor(message: string, options?: { code?: string }) {
    super(message, ErrorType.SECURITY, ErrorSeverity.CRITICAL, options?.code);
    this.name = 'SecurityError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isRetryable(error: unknown): error is AppError {
  return isAppError(error) && !!error.retry;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}