# ⚡ QuickCompare

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright" />
</div>

<br />

**QuickCompare** is a modern, real-time price comparison engine for Indian quick-commerce platforms (Blinkit and Zepto). Built for speed, precision, and a premium user experience, it allows users to find the best prices, track historical pricing trends, and set intelligent price drop alerts.

![QuickCompare Banner](https://placehold.co/1200x400/1e1e2f/ffffff?text=QuickCompare+Banner) <!-- Placeholder for banner -->

## ✨ Features

- **Real-Time Scraping:** Fetches live pricing and stock data from Blinkit and Zepto simultaneously.
- **Smart Product Matching:** Proprietary heuristic matching pipeline powered by Google Gemini AI for high-accuracy product alignment.
- **Price History Tracking:** Visualizes historical pricing trends over time using interactive `recharts`.
- **Intelligent Price Alerts:** Set target prices for products and receive notifications (Email/WebPush) when the price drops below your threshold.
- **Secure Authentication:** Integrated NextAuth.js (Auth.js v5) with Google OAuth for personalized dashboards and alert migrations.
- **Enterprise-Grade Protection:** In-memory rate limiters, strict session validation, CSRF/XSS protection, and SQLi safeguards via Prisma.

## 📸 Screenshots

| Homepage | Search Results | Product Details |
| :---: | :---: | :---: |
| ![Homepage Placeholder](https://placehold.co/400x300/1e1e2f/ffffff?text=Homepage) | ![Search Placeholder](https://placehold.co/400x300/1e1e2f/ffffff?text=Search+Results) | ![Product Placeholder](https://placehold.co/400x300/1e1e2f/ffffff?text=Product+Details) |

*(Demo GIF placeholder here)*

## 🏗 Architecture Overview

QuickCompare follows a highly modular Serverless architecture:
- **Frontend**: Next.js 16 (App Router) + React Server Components.
- **Backend APIs**: Next.js Route Handlers.
- **Scraping Engine**: Custom headless crawler pool leveraging optimized parallel execution.
- **Database**: PostgreSQL (Supabase/Neon) managed via Prisma ORM.

Detailed diagrams and workflows can be found in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## 🛠 Tech Stack

- **Framework**: Next.js 16 (Turbopack)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Custom Design System, Glassmorphism, Micro-animations)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: Auth.js (v5)
- **AI Matching**: Google Gemini API
- **Testing**: Playwright (E2E)
- **Deployment**: Docker, Render, Supabase (PgBouncer)

## 📂 Folder Structure

```
quickcompare/
├── src/
│   ├── app/          # Next.js App Router & API Endpoints
│   ├── components/   # Reusable UI Components
│   ├── lib/          # Utilities & Rate Limiting
│   ├── scraper/      # Core Scraper Engine & LLM Matching
│   └── styles/       # CSS Variables & Utilities
├── prisma/           # Database Schema
├── tests/            # Playwright E2E Test Suite
├── docs/             # Technical Documentation
└── public/           # Static Assets
```

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js 20+
- PostgreSQL instance

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/quickcompare.git
   cd quickcompare
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Copy the example file and populate your keys:
   ```bash
   cp .env.example .env
   ```
   *(See `docs/DEPLOYMENT.md` for specific key generation steps).*

4. **Initialize Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 📦 Production Deployment

QuickCompare is fully dockerized and ready for one-click deployments to Render, AWS, or Vercel. 
For a complete guide on deploying the container, configuring PgBouncer, and setting up CI/CD, see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## 🧪 Testing

The project includes an extensive End-to-End testing suite built with Playwright.

```bash
# Run all tests (Requires Chromium, WebKit, Firefox)
npx playwright test

# View test report
npx playwright show-report
```

## 🗺 Roadmap

- [ ] **Phase 2 Integration:** Add Instamart and BigBasket.
- [ ] **Notification Providers:** Implement WebPush and WhatsApp integrations.
- [ ] **Admin Dashboard:** Role-based access control for managing alerts and scraping metrics.
- [ ] **Recommendation Engine:** Suggest alternative brands with lower prices.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
