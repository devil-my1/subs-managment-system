# Phase 1: Security Hardening - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all 8 identified security vulnerabilities in the SubTracker codebase. No new features. Goal: the application no longer exposes credentials, tokens, or user data through known vulnerability vectors.

Requirements in scope: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08

</domain>

<decisions>
## Implementation Decisions

### Cookie / Auth Flow (SEC-02)

- **D-01:** Backend sets the JWT as an HttpOnly + Secure + SameSite=Lax cookie via `Set-Cookie` response header — NOT returned in JSON body.
- **D-02:** Both `POST /auth/login` and `POST /auth/register` switch to server-set cookies. The `access_token` field is removed from `AuthResponse` or replaced with user info only.
- **D-03:** Force re-login on deploy. No dual-read transition. Old client-set cookies are ignored. All active sessions are invalidated.
- **D-04:** Add `POST /auth/logout` backend endpoint that clears the HttpOnly cookie by setting `Set-Cookie: token=; max-age=0`.
- **D-05:** Remove `setToken()` and `clearToken()` from `frontend/lib/api/auth.actions.ts`. Frontend no longer manages the cookie.
- **D-06:** `frontend/lib/api/base.actions.ts` reads the token from cookies for the `Authorization: Bearer` header. With HttpOnly, `document.cookie` can no longer read it. The `proxy.ts` middleware (Next.js server-side) can still read HttpOnly cookies via `cookies()` from `next/headers` — keep that working.

### Currency API Proxy (SEC-01)

- **D-07:** Add a new FastAPI endpoint: `GET /api/v1/currency/rate?from={from}&to={to}` that calls the ExchangeRate API server-side using the key from backend env vars.
- **D-08:** Add `EXCHANGE_RATE_API_KEY` to backend env vars (`backend/src/core/config.py` Settings class).
- **D-09:** `frontend/lib/api/currency.actions.ts` is rewritten to call `/api/currency/rate` via `apiFetch()` instead of calling the external API directly.
- **D-10:** Remove the hardcoded API key literal `"a3769b4faf76f0a94a430f17"` entirely. No fallback literal. If env var is missing, backend raises a configuration error.

### Rate Limiting (SEC-04)

- **D-11:** Use `slowapi` library (FastAPI-native, Starlette middleware).
- **D-12:** Rate limits per IP (strict profile):
  - `POST /auth/login` — 10 requests/minute
  - `POST /auth/register` — 5 requests/minute
  - `POST /auth/request-password-reset` — 5 requests/minute
  - `POST /auth/verify-password-reset` — 5 requests/minute
- **D-13:** Exceed limit → 429 Too Many Requests response.

### Redis Cache (SEC-03)

- **D-14:** Remove `password_hash` field from the cached user object in `backend/src/api/deps.py`. Cache only: `id`, `email`, `name`. Reconstruct a lightweight user object from cache without the hash.

### Email Template XSS (SEC-05)

- **D-15:** Apply `html.escape()` to all user-supplied string fields interpolated into email HTML: `sub.title`, `sub.url`, and any other dynamic string values in `backend/src/services/email_templates.py`.

### Last Error Bug (SEC-06)

- **D-16:** In `backend/src/routers/jobs.py`, remove the `+ email.body` concatenation from the `last_error` assignment. Store only `str(e)[:500]`.

### Dependency Migration (SEC-07, SEC-08)

- **D-17:** Replace `python-jose` with `PyJWT`. Update `backend/requirements.txt` and rewrite `backend/src/core/security.py` to use `import jwt` (PyJWT API).
- **D-18:** Replace `passlib` with direct `bcrypt`. Update `backend/requirements.txt` and rewrite `hash_password()` / `verify_password()` in `backend/src/core/security.py` to use `bcrypt` directly.

### Claude's Discretion

- Exact `AuthResponse` schema shape after removing `access_token` (can return `user_name` + `user_id` or just a success message — whatever makes the frontend work cleanly)
- Whether to cache the rate limiter state in Redis or use in-memory (default slowapi behavior is fine)
- Specific bcrypt work factor (12 is standard)
- Whether `POST /auth/logout` also invalidates the user cache in Redis (recommended but Claude's call)

</decisions>

<specifics>
## Specific Ideas

- The existing `proxy.ts` Next.js middleware reads `cookies().get("token")` — this still works with HttpOnly cookies since it runs server-side. Verify this stays intact.
- The `apiFetch()` base function in `frontend/lib/api/base.actions.ts` currently reads `document.cookie` to extract the token for the `Authorization: Bearer` header. With HttpOnly, this will return empty string. The fix: remove the client-side token extraction from `apiFetch()` and rely on the browser automatically sending the HttpOnly cookie with each request. The backend reads it from the cookie header rather than the Authorization header — OR `apiFetch()` can be updated to not send an Authorization header at all and let the backend read from cookie. Claude should evaluate which approach requires fewer changes to the existing pattern.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security vulnerabilities to fix
- `.planning/codebase/CONCERNS.md` §Security Considerations — Full details of all 8 vulnerabilities with file locations and line numbers

### Existing auth flow
- `frontend/lib/api/auth.actions.ts` — Current setToken/clearToken implementation to be removed
- `frontend/lib/api/base.actions.ts` — apiFetch() — needs update for cookie-based auth
- `frontend/proxy.ts` — Next.js middleware that reads the token cookie server-side (must keep working)
- `backend/src/routers/auth.py` — All auth endpoints that need rate limiting + cookie response changes
- `backend/src/core/security.py` — python-jose + passlib to be replaced

### Currency
- `frontend/lib/api/currency.actions.ts` — Functions to be rewritten to call backend proxy
- `frontend/context/CurrencyContext.tsx` — Also calls currency functions; verify it still works after proxy move

### Dependencies
- `backend/requirements.txt` — python-jose and passlib to be replaced with PyJWT and bcrypt
- `backend/src/core/config.py` — Add EXCHANGE_RATE_API_KEY setting

### Redis cache
- `backend/src/api/deps.py` §get_current_user — password_hash to be removed from cache object

### Email templates
- `backend/src/services/email_templates.py` — html.escape() to be applied
- `backend/src/routers/jobs.py` — last_error bug to be fixed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/lib/api/base.actions.ts` → `apiFetch()` — all frontend API calls go through here; updating cookie handling here fixes all endpoints at once
- `backend/src/api/deps.py` → `get_current_user` dependency — central place for cache/auth logic; fixes here apply to all protected routes
- `backend/src/core/security.py` — isolated security module; dep replacements are contained here

### Established Patterns
- Backend: FastAPI dependency injection (`Depends(get_current_user)`) for auth — adding rate limit decorators follows the same pattern
- Frontend: All API calls use `apiFetch()` from `base.actions.ts` — one change point for auth headers
- Config: `backend/src/core/config.py` Pydantic Settings — add `EXCHANGE_RATE_API_KEY` here, reads from env

### Integration Points
- `backend/src/main.py` — where slowapi `Limiter` middleware gets registered
- `backend/src/routers/auth.py` — where rate limit decorators go on endpoints
- `frontend/proxy.ts` — reads `token` cookie server-side; verify it reads HttpOnly cookies correctly via `next/headers`

</code_context>

<deferred>
## Deferred Ideas

- Dep migration scope beyond SEC-07/08 (broader security audit of other Python packages) — Claude's discretion per user
- HTTPS enforcement at app level (handled by Nginx already)
- 2FA / TOTP — out of scope for this milestone

</deferred>

---

*Phase: 01-security-hardening*
*Context gathered: 2026-04-01 via discuss-phase*
