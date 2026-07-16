# Portfolio Assets: QuickCompare

## GitHub Project Description
QuickCompare is a real-time, AI-powered price comparison engine for Indian quick-commerce platforms (Blinkit and Zepto). Built with Next.js 16, Prisma, and Playwright, it features live parallel scraping, intelligent heuristic matching using Google Gemini, price tracking, and an automated alert system.

## Elevator Pitch
"QuickCompare is a high-performance web application that saves consumers money on 10-minute grocery deliveries. By scraping real-time data from platforms like Blinkit and Zepto, applying AI to perfectly match distinct product listings, and visualizing historical price trends, QuickCompare empowers users to instantly find the best deals and set alerts for future price drops."

## Resume Bullet Points
- **Architected a real-time web scraper** using Next.js 16 and custom headless adapters, reducing price-discovery time by querying multiple quick-commerce platforms in parallel.
- **Integrated Google Gemini AI** for fuzzy heuristic product matching, achieving high accuracy in consolidating fragmented e-commerce SKUs into unified relational records via Prisma and PostgreSQL.
- **Engineered an asynchronous Notification Engine** handling price alerts, utilizing robust rate-limiting and secure Google OAuth integration (Auth.js) to manage user subscriptions.
- **Implemented a comprehensive E2E CI/CD pipeline** with Playwright and GitHub Actions, ensuring 100% critical path stability across desktop and mobile form factors in a containerized Docker deployment.

## LinkedIn Project Description
🚀 Just shipped QuickCompare v1.0! 

I've been building a real-time price comparison engine tailored for India's quick-commerce giants like Blinkit and Zepto. 

What it does:
✨ Parallel scraping for instant price comparisons
🤖 Uses Google Gemini AI to resolve and match messy product names perfectly
📉 Tracks historical price data with dynamic charting
🔔 Allows users to subscribe to specific price-drop alerts 

Built using a modern stack: Next.js 16 (App Router), TypeScript, PostgreSQL, Prisma, Auth.js, and Playwright for bulletproof E2E tests.

Check out the code here: [GitHub Link]

## STAR Interview Answers

**Situation (S):** Quick-commerce platforms in India don't share identical product IDs, making price comparisons extremely difficult for consumers.
**Task (T):** I needed to build a system that could not only scrape live data from multiple platforms but also accurately determine if "Amul Gold 500ml" on Zepto was the exact same product as "Amul Milk (Gold) 0.5L" on Blinkit.
**Action (A):** I built QuickCompare. I engineered a parallel scraping pipeline in Next.js to fetch the live HTML. I then implemented a two-tier matching engine: a fast baseline string-similarity algorithm, backed by a Google Gemini LLM fallback to resolve complex nomenclature disparities dynamically.
**Result (R):** The application successfully aggregates data, rendering beautiful price history charts and allowing authenticated users to subscribe to price-drop alerts. It is fully containerized, protected against API abuse, and rigorously tested via Playwright.

## Recruiter Summary
A full-stack, AI-integrated SaaS application demonstrating proficiency in modern React paradigms (RSC, Next.js 16), backend architecture (Parallel execution, Rate-limiting, LLM integration, OAuth), database design (Prisma, PostgreSQL), and DevOps (Docker, CI/CD, E2E Testing). Highly relevant for senior frontend, full-stack, or product-engineering roles.
