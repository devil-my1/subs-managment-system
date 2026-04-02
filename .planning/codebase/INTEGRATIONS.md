# External Integrations

**Analysis Date:** 2026-04-01

## APIs & External Services

**Email:**
- Resend — transactional email for subscription renewal reminders
  - SDK/Client: `resend==2.19.0` (Python) — imported in `backend/src/routers/jobs.py`
  - Auth: `RESEND_API_KEY` env var (set on `resend.api_key` at send time)
  - Sending pattern: `resend.Emails.send(params)` with `from`, `to`, `subject`, `html` fields
  - HTML templates: `backend/src/services/email_templates.py`
  - Override recipient in dev/staging: `EMAIL_TO_OVERRIDE` env var (when set, all emails go to this address)

**TLS / SSL Certificates:**
- Let's Encrypt via Certbot — automated certificate provisioning
  - Container: `mms-certbot` (image `certbot/certbot:latest`)
  - Webroot path: `/var/www/certbot` (shared volume `certbot-webroot`)
  - Cert path: `/etc/letsencrypt` (shared volume `certbot-certs`)
  - Domain: `maytokyo.com`, `www.maytokyo.com`, `app.maytokyo.com` (in `nginx/default.conf`)

**Image CDN (referenced in config but not actively used in current source):**
- Appwrite Cloud — `cloud.appwrite.io` listed in `frontend/next.config.ts` `images.remotePatterns`
  - No Appwrite SDK found in `frontend/package.json`; likely a legacy or planned integration

## Data Storage

**Primary Database:**
- PostgreSQL 16 (Alpine)
  - Container: `mms-postgres` (image `postgres:16-alpine`)
  - Connection env var: `DATABASE_URL` — format `postgresql+asyncpg://user:pass@db:5432/dbname`
  - Additional env vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Client/ORM: SQLAlchemy 2.0.45 async (`asyncpg` driver) — `backend/src/db/session.py`
  - Migrations: Alembic 1.17.2 — `backend/alembic/versions/`
  - Schema tables: `users`, `categories`, `subscriptions`, `subscription_payments`, `reminders`
  - Data volume: `pgdata` (persisted Docker volume)

**Caching:**
- Redis 7 (Alpine)
  - Container: `mms-redis` (image `redis:7-alpine`)
  - Connection env var: `REDIS_URL` — format `redis://redis:6379/0`
  - Client: `redis-py 5.0.7` async interface (`redis.asyncio`) — `backend/src/utils/cache.py`
  - Cache TTL env vars:
    - `CACHE_USER_TTL` — default 600 seconds
    - `CACHE_LIST_TTL` — default 60 seconds
    - `CACHE_ANALYTICS_TTL` — default 120 seconds
  - Key patterns: `subs:list:{user_id}:*`, `analytics:{user_id}:*`
  - Operations: JSON get/set with TTL, prefix-based invalidation via SCAN

**File Storage:**
- Local filesystem only — no S3, GCS, or Cloudinary integrations detected

## Authentication & Identity

**Auth Provider:** Custom (self-hosted, no third-party identity provider)
  - Implementation: JWT (HS256) issued by the backend
  - Token creation: `backend/src/core/security.py` — `create_access_token()` using `python-jose`
  - Password hashing: `passlib` + `bcrypt` — `backend/src/core/security.py`
  - Token storage: HTTP cookie (`token`) on the frontend (`proxy.ts` reads `req.cookies.get("token")`)
  - Session config env vars: `JWT_SECRET`, `JWT_ALG` (default `HS256`), `ACCESS_TOKEN_MINUTES` (default 10080 = 7 days)
  - Frontend auth guard: `frontend/proxy.ts` middleware — redirects unauthenticated requests to `/sign-in`

## Internal Job / Cron System

**Cron Runner:**
- Container: `mms-cron` (image `curlimages/curl:8.10.1`)
- Script: `backend/scripts/cron-loop.sh` — infinite loop sleeping 7200 seconds (120 min)
- Calls two internal endpoints every cycle:
  - `POST http://backend:5050/api/v1/jobs/send-reminders`
  - `POST http://backend:5050/api/v1/jobs/advance-renewals`
- Auth: `X-Internal-Token` header — value from `INTERNAL_JOB_TOKEN` env var
- Handler: `backend/src/routers/jobs.py`

## Reverse Proxy / API Gateway

**Nginx:**
- Image: `nginx:1.27-alpine`
- Config: `nginx/default.conf` (HTTPS with TLSv1.2/1.3), `nginx/http-only.conf`
- Routing:
  - `/api/*` → `backend:5050` (FastAPI)
  - All other paths → `frontend:3000` (Next.js)
- Security headers: HSTS, Content-Security-Policy, Cache-Control for API responses
- DNS resolver: Docker internal `127.0.0.11`

**Next.js API Proxy (build-time rewrite):**
- `frontend/next.config.ts` rewrites `/api/:path*` → `${INTERNAL_API_URL}/api/:path*`
- This allows server-side Next.js code to call the backend directly inside Docker
- Env vars: `NEXT_PUBLIC_API_URL` (client-side base, default `/api/v1`), `INTERNAL_API_URL` (SSR, default `http://backend:5050/api/v1`)

## Monitoring & Observability

**Error Tracking:** None detected
**Metrics / APM:** None detected
**Structured Logging:** None detected — FastAPI/Uvicorn default stdout logging only

## CI/CD & Deployment

**Hosting Platform:** Self-hosted Docker Compose (domain `maytokyo.com`)
**CI Pipeline:** None detected (no `.github/workflows/`, `.gitlab-ci.yml`, etc.)
**Container Registry:** Local build — images tagged `my-managment-system-frontend:latest` and `my-managment-system-backend:latest`

## Environment Variables Summary

**Backend (`backend/.env`):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL async connection string |
| `POSTGRES_USER` | DB user (also used by the postgres container) |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DB` | DB name |
| `JWT_SECRET` | HMAC secret for JWT signing |
| `JWT_ALG` | JWT algorithm (default `HS256`) |
| `ACCESS_TOKEN_MINUTES` | Token lifetime (default 10080 = 7 days) |
| `INTERNAL_JOB_TOKEN` | Shared secret for cron → API authentication |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender address shown in emails |
| `EMAIL_TO_OVERRIDE` | Dev override: all emails sent here instead of user |
| `REDIS_URL` | Redis connection string |
| `CACHE_USER_TTL` | User cache TTL seconds |
| `CACHE_LIST_TTL` | Subscription list cache TTL seconds |
| `CACHE_ANALYTICS_TTL` | Analytics cache TTL seconds |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `TZ` | Server timezone (default `Asia/Tokyo`) |

**Frontend (build args / `.env.local`):**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Client-side API base URL (default `/api/v1`) |
| `INTERNAL_API_URL` | Server-side (SSR) API base URL (default `http://backend:5050/api/v1`) |

## Webhooks & Callbacks

**Incoming:** None detected
**Outgoing:** None detected (Resend email is fire-and-forget, no webhook callback configured)

---

*Integration audit: 2026-04-01*
