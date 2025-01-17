// Retry configuration
interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Set<string>;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: new Set([
    'NETWORK_ERROR',
    'DATABASE_ERROR',
    'RATE_LIMIT_ERROR'
  ])
};

// Retry function with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let attempt = 1;
  let delay = finalConfig.initialDelay;

  while (attempt <= finalConfig.maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error instanceof Error &&
        finalConfig.retryableErrors.has(error.name);

      if (attempt === finalConfig.maxAttempts || !isRetryable) {
        throw error;
      }

      console.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms...`,
        error
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      
      delay = Math.min(
        delay * finalConfig.backoffFactor,
        finalConfig.maxDelay
      );
      attempt++;
    }
  }

  throw new Error('Should not reach here');
}

// Retry decorator
export function withRetry(config: RetryConfig = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}