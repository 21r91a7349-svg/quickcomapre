import { ScraperLogger } from './logger';

export interface BrowserOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class BrowserLayer {
  private logger: ScraperLogger;
  
  constructor(logger: ScraperLogger) {
    this.logger = logger;
  }
  
  private getDefaultHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
    };
  }

  async fetch(url: string, options: BrowserOptions = {}): Promise<Response> {
    const { timeoutMs = 10000, headers = {} } = options;
    
    this.logger.debug(`Fetching URL: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.getDefaultHeaders(),
          ...headers
        },
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
