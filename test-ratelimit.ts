import { rateLimit } from './src/lib/rateLimit';

console.log("Testing Rate Limiter:");
for (let i = 0; i < 6; i++) {
  const result = rateLimit('test:ip1', { maxRequests: 5, windowMs: 60000 });
  console.log(`Request ${i+1}:`, result);
}
