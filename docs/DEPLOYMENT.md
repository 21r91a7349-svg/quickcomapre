# Deployment Guide

QuickCompare is configured for seamless deployment on PaaS providers like Render or Vercel, utilizing Docker for consistency and PgBouncer for database connection pooling.

## 1. Prerequisites

1. **GitHub Repository**: Your code must be pushed to a GitHub repository.
2. **Supabase (or Neon) Account**: For PostgreSQL hosting.
3. **Google Cloud Console**: For OAuth Credentials.
4. **Render Account**: For Application Hosting.

## 2. Environment Variables

Your production environment requires the following variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?pgbouncer=true"

# Auth.js Config
NEXTAUTH_URL="https://your-app-name.onrender.com"
NEXTAUTH_TRUST_HOST="true"
AUTH_SECRET="your_generated_random_secret" # Use `openssl rand -base64 32`

# Google OAuth
AUTH_GOOGLE_ID="your_google_client_id"
AUTH_GOOGLE_SECRET="your_google_client_secret"

# LLM Config
GEMINI_API_KEY="your_gemini_key"
```

## 3. Database Setup (Supabase)

1. Create a new project in Supabase.
2. Navigate to Database -> Connection Pooling.
3. Enable connection pooling and note the **Port 6543** connection string.
4. From your local terminal, initialize the schema:
   ```bash
   # Run against the standard port 5432 for migrations
   DATABASE_URL="..." npx prisma db push
   ```

## 4. Render Setup

We use Render's native Docker support.

1. Create a new **Web Service**.
2. Connect your GitHub repository.
3. Set the Runtime to **Docker**.
4. Set the Root Directory to the project root.
5. In **Environment Variables**, paste all the keys from Step 2.
6. Click **Create Web Service**. 
7. Enable **Auto-Deploy** to deploy automatically when pushing to the `main` branch.

## 5. Health Monitoring

The application exposes `/api/health` which ping tests the database and returns a `200 OK` status. You can configure Render or UptimeKuma to poll this endpoint.

## 6. Production Checklist

- [ ] `DATABASE_URL` uses PgBouncer (Port 6543).
- [ ] `NEXTAUTH_URL` exactly matches the final production domain.
- [ ] Google OAuth Credentials have the correct production callback URL (`https://your-domain.com/api/auth/callback/google`).
- [ ] Environment variables are securely stored and not committed to source control.
