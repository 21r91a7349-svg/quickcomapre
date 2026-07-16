# Release Notes

## QuickCompare v1.0.0

**Release Date:** 2026-07-16

We are thrilled to announce the v1.0.0 public release of QuickCompare!

### Highlights
- **Intelligent Price Engine:** Fully operational real-time scraping across Blinkit and Zepto.
- **AI Matching Integration:** Successfully integrated Google Gemini to match visually and textually ambiguous products across different quick-commerce platforms.
- **Enterprise-Grade Infrastructure:** Fully containerized with Docker, optimized for Render, and hardened against API abuse.

### New Features
- **Price History Charts:** Interactive line charts (`recharts`) showcasing a product's price volatility over time.
- **Price Drop Alerts:** An automated subscription system allowing users to receive notifications when target prices are met.
- **Google OAuth Integration:** Secure, one-click sign-in leveraging Auth.js (v5) to manage cross-device price alerts seamlessly.
- **Anonymous Alert Migration:** Built-in intelligence that seamlessly migrates your previously created anonymous alerts to your account the first time you sign in.

### Improvements
- Refined micro-animations and a glassmorphism design system for a premium user feel.
- Lazy-loaded heavy client-side chart dependencies, dramatically reducing Initial Load JS payload.
- Integrated comprehensive SEO parameters (`robots.txt`, `sitemap.xml`, OpenGraph tags).
- Hardened endpoints with a proprietary token-bucket Rate Limiter to prevent infrastructure DoS.

### Known Limitations
- The Playwright E2E suite currently skips local WebKit/Mobile Safari execution on highly constrained development containers due to disk space limits (`ENOSPC`). CI handles this flawlessly.
- External images scraped from third-party CDNs bypass native Next.js `<Image />` optimization unless their hostnames are proactively whitelisted in `next.config.ts`.
- Push notifications are currently stubbed in the alert background worker and await Phase 2 vendor integrations.

### Future Roadmap
1. **Platform Expansion:** Instamart and BigBasket adapters.
2. **Notification Delivery:** WebPush, Email (Resend), and WhatsApp Business integrations.
3. **Admin Dashboard:** Role-based UI for managing system health and LLM matching thresholds.
