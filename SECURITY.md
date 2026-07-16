# Security Policy

## Supported Versions

Only the latest `main` branch (v1.0.0-rc.1 and above) receives security updates.

## Authentication & Authorization
QuickCompare relies on **NextAuth (Auth.js)** for session management.
- All sessions are issued as secure `HttpOnly` cookies.
- Cross-Site Request Forgery (CSRF) protection is handled natively by NextAuth.
- Alert creation (`POST /api/alerts`) restricts the assignment of email addresses to the explicitly verified session owner to prevent spoofing.

## Rate Limiting
To prevent abuse of our scraping engines, rate-limiting is implemented in-memory (`src/lib/rateLimit.ts`):
- `/api/search`: 20 requests per minute per IP.
- `/api/alerts`: 20 GET requests, 5 POST requests per minute per IP.
*Note: For multi-container deployments, an external Redis cache is highly recommended to synchronize the token bucket limits across nodes.*

## Scraping Considerations
Our orchestrator executes headless tasks. We strictly sanitize any dynamic user input (`q`) passed to external domains to prevent unintended Remote Code Execution (RCE) or malicious injections into the puppeteer/fetch context.

## Reporting a Vulnerability
If you discover a security vulnerability within QuickCompare, please send an e-mail to security@quickcompare.app. 
Do not file a public issue. We will respond within 48 hours.
