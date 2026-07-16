# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-rc.1] - 2026-07-16
### Added
- Comprehensive Playwright E2E testing suite.
- Rate limiting implemented on `/api/search` and `/api/alerts` to protect against scraping abuse.
- Security Headers added to `next.config.ts`.
- `HEALTHCHECK` instructions integrated into the Docker container.
- CI/CD workflow created (`.github/workflows/ci.yml`).

## [0.9.0] - MVP Finalization
### Added
- **Authentication**: Auth.js (v5) integrated with Google OAuth Provider.
- **Alert Migration**: Anonymous Price Alerts are now safely migrated to the user's authenticated account upon first login.
- **Price Alerts Engine**: Notify Me modal allows subscribing to price thresholds with Background Evaluation ready architecture.
- **Product Matching**: Google Gemini AI heuristics to match identical products across platforms accurately.
- **Price History**: Real-time chart visualization implemented via `recharts`.
- **Scraping Core**: Parallel scraping execution pipelines for Blinkit and Zepto.

### Changed
- Bundle size optimizations (Lazy loaded charting dependencies).
- Enhanced SEO profiles (Sitemaps, Robots, Custom 404/500 error boundaries).
