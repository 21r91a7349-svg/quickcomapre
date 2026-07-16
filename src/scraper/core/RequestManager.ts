import { ScraperLogger, ScraperMetrics } from './logger';
import { scraperConfig } from '../config';

export class RequestManager {
  private logger = new ScraperLogger('RequestManager');
  
  // Rate limiting tracker per domain
  private lastRequestTime: Map<string, number> = new Map();
  
  // Concurrency tracking (mock implementation for MVP)
  private activeRequests = 0;

  private async enforceRateLimit(domain: string) {
    const lastTime = this.lastRequestTime.get(domain) || 0;
    const now = Date.now();
    const elapsed = now - lastTime;
    
    if (elapsed < scraperConfig.request.rateLimitMs) {
      const waitTime = scraperConfig.request.rateLimitMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime.set(domain, Date.now());
  }

  async execute<T>(
    operation: () => Promise<T>, 
    context: { domain: string, query?: string, platform?: string }
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const { maxRetries, initialBackoffMs, backoffFactor } = scraperConfig.request;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.enforceRateLimit(context.domain);
        
        // Wait if concurrency limit reached
        while (this.activeRequests >= scraperConfig.request.maxConcurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.activeRequests++;
        const result = await operation();
        this.activeRequests--;

        const executionTime = Date.now() - startTime;
        this.logger.info(`Operation succeeded`, undefined, {
          execution_time_ms: executionTime,
          retry_count: attempt - 1,
          success: true,
          platform: context.platform,
          query: context.query
        });

        return result;

      } catch (error: any) {
        this.activeRequests--;
        lastError = error;

        const isFatal = error?.status === 400 || error?.status === 404;
        
        if (isFatal || attempt === maxRetries) {
          break;
        }

        const delay = initialBackoffMs * Math.pow(backoffFactor, attempt - 1);
        this.logger.warn(`Operation failed, retrying (${attempt}/${maxRetries}) in ${delay}ms...`, { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const executionTime = Date.now() - startTime;
    this.logger.error(`Operation completely failed`, { error: lastError?.message }, {
      execution_time_ms: executionTime,
      retry_count: maxRetries,
      success: false,
      failure_reason: lastError?.message,
      platform: context.platform,
      query: context.query
    });

    throw lastError;
  }
}
