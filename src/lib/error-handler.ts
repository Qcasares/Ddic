import { toast } from '@/hooks/use-toast';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION_ERROR',
  WORKFLOW = 'WORKFLOW_ERROR',
  TEAM = 'TEAM_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Error codes mapping
const ERROR_CODES: Record<string, ErrorType> = {
  '42501': ErrorType.PERMISSION,
  '23505': ErrorType.DATABASE, // Unique violation
  '23503': ErrorType.DATABASE, // Foreign key violation
  '42P01': ErrorType.DATABASE, // Undefined table
  '42703': ErrorType.DATABASE, // Undefined column
  'PGRST301': ErrorType.AUTH, // Unauthorized
  'PGRST302': ErrorType.PERMISSION, // Forbidden
};

// Error messages
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VALIDATION]: 'Please check your input and try again',
  [ErrorType.NETWORK]: 'Network error. Please check your connection',
  [ErrorType.AUTH]: 'Authentication error. Please sign in again',
  [ErrorType.DATABASE]: 'Database error occurred',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found',
  [ErrorType.PERMISSION]: 'You do not have permission to perform this action',
  [ErrorType.WORKFLOW]: 'Invalid workflow state transition',
  [ErrorType.TEAM]: 'Team management operation failed',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred'
};

// Error handler class
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType = ErrorType.UNKNOWN,
    public details?: any,
    public retry?: () => Promise<any>
  ) {
    super(message);
    this.name = 'AppError';
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}

// Error handler function
export function handleError(error: unknown): AppError {
  console.error('Error:', error);

  if (AppError.isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Handle Supabase errors
    if ('code' in error && typeof error.code === 'string') {
      const errorType = ERROR_CODES[error.code] || ErrorType.UNKNOWN;
      return new AppError(
        error.message,
        errorType,
        { code: error.code }
      );
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return new AppError(
        'Network error occurred',
        ErrorType.NETWORK,
        undefined,
        async () => {
          // Implement retry logic here
          throw new Error('Retry not implemented');
        }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return new AppError(
        error.message,
        ErrorType.VALIDATION
      );
    }

    // Handle workflow errors
    if (error.message.includes('workflow') || error.message.includes('status')) {
      return new AppError(
        error.message,
        ErrorType.WORKFLOW
      );
    }

    // Handle team errors
    if (error.message.includes('team') || error.message.includes('member')) {
      return new AppError(
        error.message,
        ErrorType.TEAM
      );
    }

    return new AppError(error.message);
  }

  return new AppError('An unexpected error occurred');
}

// Toast error handler with retry support
export function showErrorToast(error: unknown) {
  const appError = handleError(error);
  
  const toastOptions: any = {
    title: appError.type,
    description: appError.message || ERROR_MESSAGES[appError.type],
    variant: 'destructive',
  };

  if (appError.retry) {
    toastOptions.action = {
      label: 'Retry',
      onClick: () => appError.retry?.()
    };
  }

  toast(toastOptions);

  return appError;
}

// Async error wrapper with retry support
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    showToast?: boolean;
    rethrow?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  } = { showToast: true, rethrow: false, maxRetries: 3, retryDelay: 1000 }
): Promise<T> {
  let attempts = 0;

  const attempt = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      const appError = handleError(error);
      
      if (attempts < (options.maxRetries || 3) && 
          (appError.type === ErrorType.NETWORK || appError.type === ErrorType.DATABASE)) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, options.retryDelay || 1000));
        return attempt();
      }
      
      if (options.showToast) {
        showErrorToast(appError);
      }
      
      if (options.rethrow) {
        throw appError;
      }
      
      return Promise.reject(appError);
    }
  };

  return attempt();
}

// Validation helper
export function validateWorkflowTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    draft: ['review', 'archived'],
    review: ['approved', 'rejected', 'archived'],
    approved: ['archived'],
    rejected: ['draft', 'archived'],
    archived: ['draft']
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}