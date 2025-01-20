/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 'DB_ERROR', details);
    }
}

/**
 * Validation errors for input data
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 'VALIDATION_ERROR', details);
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 'CONFIG_ERROR', details);
    }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 'NOT_FOUND', details);
    }
}

/**
 * Process failed but can be retried
 */
export class RetryableError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 'RETRYABLE_ERROR', details);
    }
}

/**
 * Error utility functions
 */
export const isAppError = (error: unknown): error is AppError => {
    return error instanceof AppError;
};

export const isDatabaseError = (error: unknown): error is DatabaseError => {
    return error instanceof DatabaseError;
};

export const isRetryable = (error: unknown): error is RetryableError => {
    return error instanceof RetryableError;
};