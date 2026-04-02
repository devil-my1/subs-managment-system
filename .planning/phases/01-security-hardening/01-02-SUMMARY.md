---
plan: 01-02
phase: 01-security-hardening
status: complete
completed: 2026-04-02
tasks_completed: 3
requirements_covered: [SEC-02, SEC-03]
---

# Plan 01-02: Cookie Auth Flow — Summary

## What Was Done

Migrated the JWT authentication flow from client-managed plain cookies to server-set HttpOnly+Secure cookies, eliminating the JavaScript-accessible token vulnerability (SEC-02) and removed the password hash from the Redis cache (SEC-03).

## Key Changes

### Backend
- `backend/src/api/deps.py` — `get_current_user` now reads token from `request.cookies.get("token")` instead of Authorization header. Cache write no longer includes `password_hash`. Removed `OAuth2PasswordBearer` dependency.
- `backend/src/schemas/auth.py` — `AuthResponse` now returns `user_name` + `user_id` only, no `access_token` field.
- `backend/src/routers/auth.py`:
  - `POST /auth/login` and `POST /auth/register` — set `Set-Cookie: token=...; HttpOnly; Secure; SameSite=lax` via `response.set_cookie()`
  - `POST /auth/logout` — new endpoint, clears the cookie with `max_age=0`
  - `POST /auth/change-password` — now fetches fresh user from DB before `verify_password()` (critical fix: cached user no longer has `password_hash`)

### Frontend
- `frontend/lib/api/auth.actions.ts` — Removed `setToken()` and `clearToken()`. `login()` and `register()` no longer manage cookies. `logout()` calls `POST /api/auth/logout`.
- `frontend/lib/api/base.actions.ts` — Removed `getToken()`, removed `Authorization: Bearer` header injection, added `withCredentials: true` so browser sends HttpOnly cookie automatically.

## Decisions Made
- Force re-login on deploy (no dual-read transition)
- `COOKIE_SECURE` from Settings (defaults `True`, can be set `False` for local HTTP dev)

## Self-Check: PASSED
