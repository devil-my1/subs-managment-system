# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Monorepo containing a decoupled full-stack web application (Next.js SPA/SSR frontend + FastAPI REST backend) plus a React Native mobile app (StMS), all orchestrated via Docker Compose behind an Nginx reverse proxy.

**Key Characteristics:**
- Frontend and backend are independently deployable Docker services
- Communication is REST over HTTP/JSON; the frontend uses an `apiFetch` wrapper around Axios
- The Next.js `next.config.ts` rewrites `/api/*` requests to the internal backend URL, so the browser always speaks to its own origin — no direct cross-origin calls in production
- JWT-based stateless auth; token stored in a browser cookie (not `localStorage`)
- Redis is used for caching (user records, subscription lists, analytics) and for transient state (password-reset codes with TTL)
- Background jobs are triggered by an external cron container that POSTs to internal-only API endpoints (token-guarded), not a scheduler embedded in the process

## Layers

**Presentation (Frontend — Next.js App Router):**
- Purpose: Renders UI, orchestrates data fetching, handles auth flow
- Location: `frontend/app/`
- Contains: Route layouts, page components (all `"use client"` for data-heavy pages), a single root layout
- Depends on: `frontend/lib/api/` (API client functions), `frontend/context/` (React context), `frontend/components/`
- Used by: End users via browser; Nginx proxies to port 3000

**API Client Layer (Frontend):**
- Purpose: Encapsulates all HTTP calls to the backend REST API
- Location: `frontend/lib/api/`
- Contains: `base.actions.ts` (Axios wrapper with token injection), `auth.actions.ts`, `subs.actions.ts`, `analytics.actions.ts`, `category.actions.ts`, `currency.actions.ts`
- Depends on: Axios, browser cookie for JWT token
- Used by: Page components and hooks

**API / Router Layer (Backend — FastAPI):**
- Purpose: Validates requests, enforces auth, delegates to services, returns Pydantic-validated responses
- Location: `backend/src/routers/` and `backend/src/main.py`
- Contains: `auth.py`, `subscriptions.py`, `analytics.py`, `category.py`, `jobs.py`
- Depends on: `src/api/deps.py` (`get_current_user`), `src/schemas/`, `src/services/`, `src/db/session.py`
- Used by: Frontend via Nginx proxy at `/api/v1/*`; cron container for `/api/v1/jobs/*`

**Service Layer (Backend):**
- Purpose: Business logic that does not belong in a single router handler (renewal advancement, reminder scheduling, email dispatch)
- Location: `backend/src/services/`
- Contains: `subscriptions.py` (advance due renewals, regenerate email reminders, manual renew), `email_templates.py`
- Depends on: SQLAlchemy models, `resend` SDK
- Used by: Router handlers in `subscriptions.py` and `jobs.py`

**Data / Persistence Layer (Backend):**
- Purpose: ORM models, database session, migrations
- Location: `backend/src/models/`, `backend/src/db/`, `backend/alembic/`
- Contains: `User`, `Subscription`, `SubscriptionPayment`, `Reminder`, `Category` models (all inherit `Base` from `src/models/base.py`); async SQLAlchemy session factory in `src/db/session.py`; Alembic migrations in `alembic/versions/`
- Depends on: PostgreSQL via `asyncpg` driver
- Used by: All router handlers and service functions via `get_db` dependency

**Cross-Cutting Utilities (Backend):**
- Purpose: Shared helpers used across routers/services
- Location: `backend/src/utils/`
- Contains: `cache.py` (Redis async client, `cache_get_json` / `cache_set_json` / `cache_delete_prefix`), `logs.py` (named loggers per domain: `auth_logger`, `subscriptions_logger`, `analytics_logger`)
- Depends on: `redis.asyncio`, `src/core/config.py`

## Data Flow

**Authenticated API Request (e.g., list subscriptions):**

1. Browser sends `GET /api/v1/subscriptions` with `Authorization: Bearer <jwt>` header
2. Nginx (`app.maytokyo.com`) forwards `/api/*` to `backend:5050`
3. FastAPI router (`subscriptions.py`) receives the request
4. `get_current_user` dependency in `src/api/deps.py` decodes the JWT, checks Redis cache for user object, falls back to DB query
5. Router queries the DB (optionally Redis cache first for list results)
6. Pydantic schema (`SubscriptionOut`) serializes the response
7. JSON response returns through Nginx to the browser

**Frontend Data Flow (Client Component):**

1. Page component mounts and calls `apiFetch` from `lib/api/subs.actions.ts`
2. `apiFetch` reads the JWT from `document.cookie`, attaches `Authorization` header
3. Axios sends request to `/api/v1/...` (same origin; Next.js rewrites to internal backend in dev or Nginx handles in production)
4. Response is set into local React `useState`; no global server-state library (no Redux, no React Query)

**Background Job Flow (cron):**

1. `cron-loop.sh` in the `cron` container runs on a schedule and POSTs to `/api/v1/jobs/send-reminders` and `/api/v1/jobs/advance-renewals`
2. Requests carry `X-Internal-Token` header verified against `settings.INTERNAL_JOB_TOKEN`
3. `jobs.py` router delegates to `services/subscriptions.py` for renewal advancement and sends email via `resend` SDK for reminders
4. Cache keys for affected users are invalidated after job completion

**State Management:**
- No centralized state manager (no Redux, Zustand, React Query, or SWR)
- Each page fetches its own data into local `useState` on mount
- `CurrencyContext` (`frontend/context/CurrencyContext.tsx`) is the only shared React context; it holds the selected base currency and a currency conversion helper with a 10-minute in-memory rate cache
- Auth state is implicit: presence of a valid `token` cookie is the auth signal; `useGetUser` hook fetches `/auth/me` to hydrate user info

## Key Abstractions

**`apiFetch` (Frontend API client):**
- Purpose: Single Axios wrapper that auto-attaches JWT from cookie and normalizes API errors to `Error` objects
- Location: `frontend/lib/api/base.actions.ts`
- Pattern: Detects SSR vs browser context to pick the correct base URL (`INTERNAL_API_URL` server-side, `NEXT_PUBLIC_API_URL` client-side)

**`get_current_user` (Backend auth dependency):**
- Purpose: FastAPI dependency that validates the JWT and returns the authenticated `User` ORM object; Redis-cached
- Location: `backend/src/api/deps.py`
- Pattern: FastAPI `Depends()` injected into any protected router handler

**`Base` (ORM declarative base):**
- Purpose: All SQLAlchemy models inherit from this single base class
- Location: `backend/src/models/base.py`
- Pattern: Standard SQLAlchemy 2.x declarative mapping with `Mapped` / `mapped_column`

**Pydantic Schemas:**
- Purpose: Request validation (input) and response serialization (output); strict separation from ORM models
- Location: `backend/src/schemas/`
- Pattern: Separate `*Create`, `*Update`, `*Out` classes per resource

## Entry Points

**Frontend Root:**
- Location: `frontend/app/page.tsx`
- Triggers: Any browser request to `/`
- Responsibilities: Immediately `redirect("/dashboard")`

**Frontend Root Layout:**
- Location: `frontend/app/layout.tsx`
- Responsibilities: Wraps entire app in `CurrencyProvider`, mounts `Toaster`, sets global font and dark theme

**Backend ASGI Application:**
- Location: `backend/src/main.py`
- Triggers: Uvicorn starts the FastAPI app
- Responsibilities: Registers CORS middleware, mounts all routers under `/api/v1`

## Error Handling

**Strategy:** Explicit HTTP exceptions with user-friendly detail strings; generic fallback for unexpected errors

**Backend Patterns:**
- Routers catch `HTTPException` first (re-raise), then catch `Exception` and wrap in a 500 `HTTPException` with a safe message
- Structured logging via named loggers for each domain (auth, subscriptions, analytics)

**Frontend Patterns:**
- `apiFetch` maps Axios error responses to `Error` objects using `err.response.data?.detail`
- Page components catch errors into local `error` state and display inline error messages
- `sonner` toast library used for success/failure notifications in forms

## Cross-Cutting Concerns

**Logging:** Named Python loggers per domain in `backend/src/utils/logs.py`; structured `extra` dict includes `user_id`, `email`, operation name

**Validation:** Pydantic v2 schemas on backend; React Hook Form + Zod on frontend (visible in `AuthForm.tsx` and `AddSubDialog.tsx`)

**Authentication:** JWT Bearer tokens; issued at login/register; stored in `HttpOnly`-equivalent browser cookie with 7-day `max-age`; validated on every request via `get_current_user` FastAPI dependency; user object is Redis-cached for `CACHE_USER_TTL` seconds (default 600 s) to reduce DB hits

**Caching (Backend):** Redis; three cache TTL categories configured in `settings`: user records (600 s), subscription lists (60 s), analytics results (120 s); cache keys follow pattern `{resource}:{user_id}:{params}`; cache is invalidated by prefix delete after mutations

---

*Architecture analysis: 2026-04-01*
