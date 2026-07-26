export const scraperConfig = {
  // Timeouts (ms)
  timeouts: {
    pageLoad: 30000,
    apiFetch: 15000,
    elementWait: 10000,
    adapterTimeoutMs: process.env.SCRAPER_ADAPTER_TIMEOUT_MS ? parseInt(process.env.SCRAPER_ADAPTER_TIMEOUT_MS, 10) : 4000,
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
    freshnessWindowMs: (process.env.SEARCH_CACHE_TTL_MINUTES ? parseInt(process.env.SEARCH_CACHE_TTL_MINUTES, 10) : 30) * 60 * 1000,
  },

  // Browser Settings
  browser: {
    headless: true,
    stealthEnabled: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // Use /tmp instead of /dev/shm (important in containers)
      '--disable-gpu',              // No GPU in server environment
      '--no-zygote',                // Saves ~50MB RAM by skipping zygote process
      '--disable-extensions',       // No extensions needed
      '--disable-background-networking',
      '--disable-default-apps',
      '--mute-audio',
    ],
  },
  
  // Proxy configuration
  proxy: {
    enabled: process.env.USE_PROXY === 'true',
    type: 'residential' as 'residential' | 'datacenter' | 'none',
    url: process.env.PROXY_URL || '',
  }
};
