import { grpc } from '@improbable-eng/grpc-web';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: grpc.Code[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    grpc.Code.Unavailable,
    grpc.Code.DeadlineExceeded,
    grpc.Code.ResourceExhausted,
    grpc.Code.Aborted,
  ],
};

/**
 * Determines if an error is retryable based on its characteristics
 */
function isRetryableError(error: any, retryableErrors: grpc.Code[]): boolean {
  // Check if error has grpc code information
  if (error?.cause?.grpcCode && retryableErrors.includes(error.cause.grpcCode)) {
    return true;
  }
  
  // Check error message for network-related issues
  const errorMessage = error?.message?.toLowerCase() || '';
  const networkIndicators = ['network', 'connection', 'timeout', 'unreachable', 'disconnected'];
  
  return networkIndicators.some(indicator => errorMessage.includes(indicator));
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Executes an async operation with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Don't retry if the error is not retryable
      if (!isRetryableError(error, config.retryableErrors)) {
        break;
      }
      
      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt, config);
      console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all attempts failed
  throw lastError;
}

/**
 * Retry wrapper specifically for critical read operations
 */
export function withCriticalRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
  });
}

/**
 * Retry wrapper for user-initiated operations (fewer retries, faster feedback)
 */
export function withUserRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 2,
    initialDelay: 1000,
    maxDelay: 3000,
  });
}