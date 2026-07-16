export const scraperConfig = {
  // Timeouts (ms)
  timeouts: {
    pageLoad: 30000,
    apiFetch: 15000,
    elementWait: 10000,
  },
  
  // Retries & Queue
  request: {
    maxRetries: 3,
    initialBackoffMs: 1000,
    backoffFactor: 2,
    maxConcurrency: 5,
    rateLimitMs: 500, // min delay between requests to same domain
  },

  // Caching Windows (ms)
  cache: {
    freshnessWindowMs: 30 * 60 * 1000, // 30 minutes
  },

  // Browser Settings
  browser: {
    headless: true,
    stealthEnabled: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
  },
  
  // Proxy configuration
  proxy: {
    enabled: process.env.USE_PROXY === 'true',
    type: 'residential' as 'residential' | 'datacenter' | 'none',
    url: process.env.PROXY_URL || '',
  }
};
