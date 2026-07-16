export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface ScraperMetrics {
  execution_time_ms?: number;
  retry_count?: number;
  success?: boolean;
  failure_reason?: string;
  cache_status?: 'HIT' | 'MISS' | 'STALE';
  platform?: string;
  query?: string;
  products_found?: number;
}

export class ScraperLogger {
  private platform: string;

  constructor(platform: string) {
    this.platform = platform;
  }

  private log(level: LogLevel, message: string, meta?: any, metrics?: ScraperMetrics) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      platform: this.platform,
      level,
      message,
      ...meta,
      ...metrics
    };
    
    // In production, this goes to standard output for Datadog/ELK parsing
    const logString = JSON.stringify(logEntry);
    if (level === 'error') {
      console.error(logString);
    } else if (level === 'warn') {
      console.warn(logString);
    } else {
      console.log(logString);
    }
  }

  info(message: string, meta?: any, metrics?: ScraperMetrics) { this.log('info', message, meta, metrics); }
  warn(message: string, meta?: any, metrics?: ScraperMetrics) { this.log('warn', message, meta, metrics); }
  error(message: string, meta?: any, metrics?: ScraperMetrics) { this.log('error', message, meta, metrics); }
  debug(message: string, meta?: any, metrics?: ScraperMetrics) { 
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta, metrics);
    }
  }
}
