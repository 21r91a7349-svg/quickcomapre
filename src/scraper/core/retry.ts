import { ScraperLogger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  backoffFactor: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  logger: ScraperLogger,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...defaultOptions, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 400 Bad Request or 404 Not Found as they are deterministic
      if (error?.status === 400 || error?.status === 404) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt - 1);
        logger.warn(`Operation failed, retrying (${attempt}/${config.maxRetries}) in ${delay}ms...`, { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Operation failed after ${config.maxRetries} attempts`, { error: lastError?.message });
  throw lastError;
}
