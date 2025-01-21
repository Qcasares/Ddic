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
} from '../errors';
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
});
