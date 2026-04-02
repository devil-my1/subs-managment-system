---
plan: 01-03
phase: 01-security-hardening
status: complete
completed: 2026-04-02
tasks_completed: 2
requirements_covered: [SEC-01, SEC-04]
---

# Plan 01-03: Rate Limiting + Currency Proxy — Summary

## What Was Done

Added IP-based rate limiting to 4 auth endpoints (SEC-04) and moved the currency API key off the frontend bundle by creating a backend proxy endpoint (SEC-01).

## Key Changes

### Backend
- `backend/src/core/limiter.py` — New file. Creates `slowapi.Limiter` instance using `get_remote_address`.
- `backend/src/main.py` — Registers `SlowAPIMiddleware`, sets `app.state.limiter`, adds custom 429 exception handler, includes currency router.
- `backend/src/routers/auth.py` — Added `@limiter.limit()` decorators and `request: Request` parameter to:
  - `POST /auth/register` — 5/minute
  - `POST /auth/login` — 10/minute
  - `POST /auth/request-password-reset` — 5/minute
  - `POST /auth/verify-password-reset` — 5/minute
- `backend/src/routers/currency.py` — New file. `GET /currency/rate?from=USD&to=JPY` proxies to ExchangeRate API using `settings.EXCHANGE_RATE_API_KEY` (server-side only). Returns `{from, to, rate}`.

### Frontend
- `frontend/lib/api/currency.actions.ts` — Completely rewritten. `getExchangeRate()` and `exchangeAmount()` now call `/api/currency/rate` via `apiFetch()`. No hardcoded API key anywhere in frontend code.

## Self-Check: PASSED
