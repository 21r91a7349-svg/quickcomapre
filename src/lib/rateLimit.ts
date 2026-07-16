type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(identifier: string, config: RateLimitConfig) {
  const now = Date.now();
  const entry = store.get(identifier);

  // Clean up expired entries periodically (simplistic cleanup)
  if (Math.random() < 0.1) {
    for (const [key, val] of store.entries()) {
      if (now > val.resetTime) {
        store.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { success: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    console.warn(`[RATE LIMIT] Abuse attempt detected for identifier: ${identifier}`);
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: config.maxRequests - entry.count };
}
