# QuickCompare Production Deployment & Configuration Guide

QuickCompare is configured for automated, secure deployment on PaaS providers (such as Render or AWS ECS), utilizing Docker for deterministic containerization, Prisma for database migrations, and PgBouncer for PostgreSQL connection pooling.

---

## 1. Environment Variable Reference

Sensitive credentials and environment configurations MUST be supplied directly via Render Environment Variables or production container secrets. **Never commit sensitive credentials to source control.**

### Required Production Environment Variables:

| Variable | Sensitive? | Purpose / Description | Example / Instructions |
|----------|------------|-----------------------|------------------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string with extensions enabled (`pg_trgm`, `uuid-ossp`, `vector`). | `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres` |
| `AUTH_SECRET` | **Yes** | Cryptographic secret for signing session JWT tokens. | Generated via `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | **Yes** | Google OAuth Client ID (supplied via deployment environment). | `xxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | **Yes** | Google OAuth Client Secret (supplied via deployment environment). | `GOCSPX-xxxx...` |
| `GEMINI_API_KEY` | **Yes** | Gemini API Key for semantic product matching embeddings. | `AIzaSy...` |
| `NODE_ENV` | No | Node execution mode (`production`). | `production` |
| `PORT` | No | Container HTTP port. | `3000` |
| `HOSTNAME` | No | Network bind host. | `0.0.0.0` |

---

## 2. Automated Database Migration Workflow

QuickCompare uses a strict **fail-fast, non-destructive forward migration strategy**:

1. **PostgreSQL Extensions**:
   All required extensions (`pg_trgm`, `uuid-ossp`, `vector`) are declared in the committed migration history (`prisma/migrations/20260715141054_init_production/migration.sql`) using `CREATE EXTENSION IF NOT EXISTS`. Fresh databases initialize required extensions automatically without manual SQL execution.

2. **Automated Migration Execution**:
   Container startup automatically invokes `./docker-entrypoint.sh`, executing:
   ```bash
   npx prisma migrate deploy
   ```
   If database migrations fail or `DATABASE_URL` is missing, the container exits with code `1` immediately (**fail-fast**), preventing broken deployments.

3. **Schema Validation Health Check**:
   The `/api/health` endpoint queries database connectivity and verifies essential tables (`Platform`, `Product`, `Listing`). The container is only declared healthy after migrations have successfully executed and tables are accessible.

---

## 3. Render Deployment Procedure

1. **Create Web Service**:
   Connect your GitHub repository to Render and create a new **Web Service**. Select **Docker** as the runtime.

2. **Configure Environment Variables**:
   In the Render dashboard, navigate to **Environment** and add the required variables listed in Section 1 (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `GEMINI_API_KEY`).

3. **Google OAuth Callback URL**:
   Ensure your Google Cloud Console Authorized Redirect URIs include:
   `https://<your-render-app>.onrender.com/api/auth/callback/google`

4. **Health Check Endpoint**:
   Render will automatically poll `/api/health` every 30 seconds. The service will transition to Healthy only after database schema verification succeeds.

---

## 4. Docker Security Architecture

- **Non-Root Runtime User**: The production container executes under user `nextjs` (`UID 1001`, `GID 1001`).
- **Permissions**: Playwright binaries `/ms-playwright` and standalone application files `/app` are owned by `nextjs:nodejs`.
