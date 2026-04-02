---
phase: 01-security-hardening
verified: 2026-04-01T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 1: Security Hardening Verification Report

**Phase Goal:** The application no longer exposes credentials, tokens, or user data through known vulnerability vectors
**Verified:** 2026-04-01
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Currency conversion works without any API key present in the frontend JavaScript bundle | VERIFIED | `currency.actions.ts` calls `apiFetch('/currency/rate?...')` with no API key; `currency.py` holds key server-side in `settings.EXCHANGE_RATE_API_KEY` |
| 2 | The JWT auth cookie is HttpOnly and Secure — JavaScript cannot read it and is not sent over plain HTTP | VERIFIED | `auth.py` sets `httponly=True, secure=settings.COOKIE_SECURE` on both `/register` and `/login`; `auth.actions.ts` has no `setToken`, `clearToken`, or `document.cookie`; `base.actions.ts` uses `withCredentials: true` and no `Authorization` header |
| 3 | Viewing the Redis cache for a logged-in user shows no password hash field | VERIFIED | `deps.py` `cache_set_json` call stores only `id`, `email`, `name`, `created_at` — no `password_hash` field |
| 4 | Rapid repeated login/register/password-reset requests from the same IP are rejected with 429 after configured limit | VERIFIED | `@limiter.limit()` applied to `/register` (5/min), `/login` (10/min), `/request-password-reset` (5/min), `/verify-password-reset` (5/min); `main.py` registers `SlowAPIMiddleware` via `app.state.limiter` and `app.add_exception_handler(RateLimitExceeded, ...)` |
| 5 | A subscription with HTML tags in its title renders as escaped text in the reminder email, not as raw HTML | VERIFIED | `email_templates.py` applies `html.escape(title)` in both `renewal_subject()` and `renewal_html()`; `html.escape(url)` also applied |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/core/security.py` | PyJWT + bcrypt, no python-jose/passlib | VERIFIED | `import jwt`, `import bcrypt`; full implementations present; 29 lines |
| `backend/requirements.txt` | PyJWT present, python-jose absent, passlib absent | VERIFIED | `PyJWT==2.12.1` on line 27; no python-jose; no passlib; `slowapi==0.1.9` present |
| `backend/src/routers/auth.py` | HttpOnly+Secure cookie on login/register; rate limiting on 4 endpoints | VERIFIED | `set_cookie(httponly=True, secure=settings.COOKIE_SECURE)` on both; `@limiter.limit()` on all 4 endpoints |
| `backend/src/api/deps.py` | Read token from cookie; cache excludes password_hash | VERIFIED | `request.cookies.get("token")`; cache payload has no `password_hash` field |
| `frontend/lib/api/auth.actions.ts` | No setToken/clearToken/document.cookie | VERIFIED | File uses only `apiFetch()`; no token management present |
| `frontend/lib/api/base.actions.ts` | withCredentials: true; no Authorization Bearer | VERIFIED | `withCredentials: true` on line 23; no `Authorization` header injection |
| `frontend/lib/api/currency.actions.ts` | No hardcoded API key; calls /currency/rate | VERIFIED | Uses `apiFetch('/currency/rate?...')`; no API key string present |
| `backend/src/routers/currency.py` | Backend proxy using settings.EXCHANGE_RATE_API_KEY | VERIFIED | Reads `settings.EXCHANGE_RATE_API_KEY`; proxies to ExchangeRate API; returns `{from, to, rate}` |
| `backend/src/main.py` | SlowAPIMiddleware registered; currency router included | VERIFIED | `app.state.limiter = limiter`; `app.add_exception_handler(RateLimitExceeded, ...)`; `currency.router` included |
| `backend/src/core/limiter.py` | Limiter instance using get_remote_address | VERIFIED | `Limiter(key_func=get_remote_address)` |
| `backend/src/services/email_templates.py` | html.escape() on user-supplied fields | VERIFIED | `import html`; `html.escape(title)` in both functions; `html.escape(url)` when url present |
| `backend/src/routers/jobs.py` | last_error = str(e)[:500] only, no email.body | VERIFIED | Line 80: `reminder.last_error = str(e)[:500]`; no `email.body` concatenation |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/currency.actions.ts` | `backend/currency.py` | `apiFetch('/currency/rate')` | WIRED | apiFetch call with query params; backend route exists at `/currency/rate` |
| `frontend/base.actions.ts` | browser cookie jar | `withCredentials: true` | WIRED | axios config sets `withCredentials: true`; no manual token handling |
| `backend/auth.py` (login) | browser cookie jar | `response.set_cookie(httponly=True, ...)` | WIRED | Both login and register set cookie with correct flags |
| `backend/deps.py` | JWT cookie | `request.cookies.get("token")` | WIRED | Reads from cookies, not Authorization header |
| `backend/deps.py` | Redis cache | `cache_set_json` without password_hash | WIRED | Cache payload verified to exclude password_hash |
| `backend/auth.py` (rate limit) | SlowAPI | `@limiter.limit()` + `app.state.limiter` | WIRED | Decorators on 4 endpoints; middleware registered in main.py |
| `backend/email_templates.py` | html.escape | `import html` + `html.escape(title/url)` | WIRED | Applied in both subject and html body generators |
| `backend/jobs.py` | last_error column | `str(e)[:500]` | WIRED | Single assignment with no body concatenation |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| SEC-01 | Currency API key not in frontend bundle | SATISFIED | `currency.actions.ts` contains no API key; proxied via `currency.py` |
| SEC-02 | JWT cookie set server-side with HttpOnly and Secure | SATISFIED | `auth.py` `set_cookie(httponly=True, secure=settings.COOKIE_SECURE)` on login and register |
| SEC-03 | Redis cache does not store password hashes | SATISFIED | `deps.py` cache payload excludes `password_hash`; `change-password` fetches fresh from DB |
| SEC-04 | Auth endpoints rate limited | SATISFIED | 4 endpoints decorated with `@limiter.limit()`; SlowAPIMiddleware active |
| SEC-05 | Email templates escape user-supplied HTML | SATISFIED | `html.escape(title)` and `html.escape(url)` applied in `email_templates.py` |
| SEC-06 | last_error stores only error string | SATISFIED | `jobs.py` line 80: `reminder.last_error = str(e)[:500]` — no email body |
| SEC-07 | JWT signing uses PyJWT (not python-jose) | SATISFIED | `security.py` imports `jwt` (PyJWT); `requirements.txt` has `PyJWT==2.12.1`, no python-jose |
| SEC-08 | Password hashing uses direct bcrypt (not passlib) | SATISFIED | `security.py` imports `bcrypt` directly; `requirements.txt` has `bcrypt==4.0.1`, no passlib |

**All 8 security requirements satisfied.**

---

### Anti-Patterns Found

No blockers or stubs detected. Specific checks:

- `currency.actions.ts`: No hardcoded API key strings present
- `auth.actions.ts`: No `setToken`, `clearToken`, `document.cookie`, or Bearer token logic
- `base.actions.ts`: No `Authorization: Bearer` header injection; no `getToken()` call
- `deps.py`: Cache payload has no `password_hash` field
- `jobs.py`: No `email.body` concatenation on line 80; `last_error` is clean `str(e)[:500]`
- `security.py`: No `from jose` or `from passlib` imports
- `requirements.txt`: Confirmed absence of `python-jose` and `passlib`

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

---

### Human Verification Required

The following behaviors cannot be confirmed programmatically:

#### 1. Rate Limit 429 Response in Practice

**Test:** Send 11 rapid POST requests to `/api/v1/auth/login` from the same IP
**Expected:** First 10 succeed (or fail with 401); the 11th returns HTTP 429 with rate limit error
**Why human:** Cannot simulate IP-based rate limiting without a running server

#### 2. Cookie Flags in Browser DevTools

**Test:** Log in via the frontend; open DevTools > Application > Cookies
**Expected:** `token` cookie has HttpOnly checked, Secure checked, SameSite=Lax
**Why human:** Requires browser inspection; cannot verify cookie flags from static code alone in a live browser session

#### 3. HTML Escaping in Received Email

**Test:** Create a subscription with title `<script>alert('xss')</script>` and trigger a reminder email
**Expected:** Email body shows literal `&lt;script&gt;alert('xss')&lt;/script&gt;` as text, not an executed script
**Why human:** Requires live email delivery via Resend; cannot test without credentials and a real email send

---

### Gaps Summary

No gaps found. All 5 success criteria are met by the actual code, not just claimed in summaries:

1. Currency proxy is real — `currency.py` holds the key server-side; frontend has no key
2. Cookie hardening is real — `httponly=True` and `secure=settings.COOKIE_SECURE` set on both login and register
3. Redis cache exclusion is real — `deps.py` cache payload verified to have no `password_hash` field
4. Rate limiting is real — `@limiter.limit()` decorators on 4 endpoints with SlowAPI middleware wired in `main.py`
5. XSS prevention is real — `html.escape()` applied to both `title` and `url` in `email_templates.py`; `last_error` is clean in `jobs.py`

Additionally, SEC-07 (PyJWT) and SEC-08 (direct bcrypt) are fully implemented and verified against both `security.py` source and `requirements.txt`.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
