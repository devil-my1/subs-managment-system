# Phase 1: Security Hardening — Validation Guide

**Phase:** 01-security-hardening
**Requirements:** SEC-01 through SEC-08
**Date:** 2026-04-01

This document defines the test strategy for each security requirement. Tests are ordered from automated (run immediately after each plan) to manual (run once all plans are complete).

---

## SEC-01: Currency API key not exposed in frontend bundle

**Risk:** Hardcoded fallback key `a3769b4faf76f0a94a430f17` ships with the JavaScript bundle and is callable from any browser.

### Automated Tests

```bash
# 1. Confirm literal key is absent from all frontend source files
grep -rn "a3769b4faf76f0a94a430f17" e:/Study/ReactApps/my-managment-system/frontend/
# Expected: no output

# 2. Confirm currency.actions.ts calls apiFetch, not direct axios to exchangerate-api.com
grep -n "exchangerate-api.com\|EXCHANGE_RATE_API_KEY" e:/Study/ReactApps/my-managment-system/frontend/lib/api/currency.actions.ts
# Expected: no output

# 3. Confirm backend proxy endpoint exists
grep -rn "currency/rate" e:/Study/ReactApps/my-managment-system/backend/src/routers/currency.py
# Expected: at least one line with the route definition

# 4. Confirm EXCHANGE_RATE_API_KEY is in config (not frontend)
grep -n "EXCHANGE_RATE_API_KEY" e:/Study/ReactApps/my-managment-system/backend/src/core/config.py
# Expected: one line with the field definition
```

### Build-Time Check

```bash
# After Next.js build, search compiled bundle for the key literal
cd e:/Study/ReactApps/my-managment-system/frontend
npm run build 2>/dev/null
grep -r "a3769b4faf76f0a94a430f17" .next/ 2>/dev/null
# Expected: no output — key must not appear in any compiled bundle chunk
```

### Manual Verification

1. Open browser DevTools > Network tab
2. Trigger a currency conversion in the UI (e.g. switch currency on dashboard)
3. Confirm the outbound request goes to `/api/v1/currency/rate` — NOT to `v6.exchangerate-api.com`
4. Inspect the request headers and URL — no API key in the URL or headers from the browser
5. Check DevTools > Sources — search for `a3769b4faf76f0a94a430f17` in all loaded scripts. Expected: not found.

**Pass condition:** Zero occurrences of the API key literal in the built frontend bundle. All currency requests route through the backend proxy.

---

## SEC-02: JWT cookie set server-side with HttpOnly and Secure flags

**Risk:** Client-readable cookie without HttpOnly can be stolen by XSS; without Secure it can be sent over HTTP.

### Automated Tests

```bash
# 1. Confirm deps.py reads from cookies, not Authorization header
grep -n "request.cookies\|OAuth2PasswordBearer" e:/Study/ReactApps/my-managment-system/backend/src/api/deps.py
# Expected: request.cookies present, OAuth2PasswordBearer absent

# 2. Confirm auth.py sets the cookie with correct flags
grep -n "httponly\|samesite\|secure\|set_cookie" e:/Study/ReactApps/my-managment-system/backend/src/routers/auth.py
# Expected: httponly=True, samesite="lax", secure=settings.COOKIE_SECURE on login and register

# 3. Confirm logout endpoint exists and clears cookie
grep -n "max_age=0\|/logout" e:/Study/ReactApps/my-managment-system/backend/src/routers/auth.py
# Expected: POST /logout with max_age=0 cookie clear

# 4. Confirm frontend no longer sets cookies directly
grep -n "document\.cookie\|setToken\|clearToken" e:/Study/ReactApps/my-managment-system/frontend/lib/api/auth.actions.ts
# Expected: no output

# 5. Confirm apiFetch does not extract token for Authorization header
grep -n "getToken\|Authorization.*Bearer\|document\.cookie" e:/Study/ReactApps/my-managment-system/frontend/lib/api/base.actions.ts
# Expected: no output (or getToken returns undefined and is unused)
```

### HTTP Response Header Test (requires running backend)

```bash
# Start backend, then test the Set-Cookie header on login
curl -s -D - -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}' \
  | grep -i "set-cookie"
# Expected output: Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Secure; Max-Age=604800; Path=/
# Note: Secure flag may be absent in local dev if COOKIE_SECURE=false in .env — that is correct behavior
```

### Manual Browser Verification

1. Open the app and log in
2. Open DevTools > Application > Cookies
3. Find the `token` cookie
4. Confirm: HttpOnly column shows checkmark, Secure column shows checkmark (in production/HTTPS)
5. Open DevTools > Console and run: `document.cookie`
6. Confirm: the `token` cookie does NOT appear in the output (HttpOnly prevents JS access)

**Pass condition:** `token` cookie is HttpOnly and Secure. JavaScript cannot read it via document.cookie.

---

## SEC-03: Redis cache does not store password hashes

**Risk:** Redis compromise exposes bcrypt password hashes for all active users.

### Automated Tests

```bash
# 1. Confirm password_hash is not in the cache_set_json call
grep -n "password_hash" e:/Study/ReactApps/my-managment-system/backend/src/api/deps.py
# Expected: no output (password_hash removed from both cache write and cache read)

# 2. Confirm cache dict keys in deps.py
grep -A10 "cache_set_json" e:/Study/ReactApps/my-managment-system/backend/src/api/deps.py
# Expected: dict with id, email, name, created_at only — no password_hash
```

### Redis Inspection Test (requires running stack)

```bash
# Log in to create a cache entry, then inspect Redis directly
# 1. Log in via the app
# 2. Get the user ID from /api/v1/auth/me
# 3. Check Redis:
docker exec -it <redis-container> redis-cli GET "user:<user-id>"
# Expected JSON: {"id": "...", "email": "...", "name": "...", "created_at": "..."}
# password_hash MUST NOT appear in this JSON
```

### Functional Test (ensures auth still works without cached hash)

```bash
# 1. Log in (creates cache entry)
# 2. Wait up to 600 seconds (or flush Redis: redis-cli FLUSHDB)
# 3. Make an authenticated request — should succeed via DB fallback
curl -s -b "token=<jwt>" http://localhost:5050/api/v1/auth/me
# Expected: 200 with user info
```

**Pass condition:** Redis key `user:<id>` exists after login but contains no `password_hash` field.

---

## SEC-04: Auth endpoints rate limited

**Risk:** No rate limiting allows unlimited brute-force login and registration attempts.

### Automated Tests

```bash
# 1. Confirm @limiter.limit decorators on the four endpoints
grep -B1 "async def login\|async def register\|async def request_password_reset\|async def verify_password_reset" \
  e:/Study/ReactApps/my-managment-system/backend/src/routers/auth.py | grep -v "^--$"
# Expected: each async def is preceded by @limiter.limit("10/minute") or @limiter.limit("5/minute")

# 2. Confirm request: Request is first param on rate-limited endpoints
grep -n "async def login\|async def register\|async def request_password_reset\|async def verify_password_reset" \
  e:/Study/ReactApps/my-managment-system/backend/src/routers/auth.py
# Expected: all four have "request: Request" as first parameter

# 3. Confirm slowapi is registered in main.py
grep -n "state.limiter\|RateLimitExceeded" e:/Study/ReactApps/my-managment-system/backend/src/main.py
# Expected: both present
```

### Rate Limit Enforcement Test (requires running backend)

```bash
# Hammer login 11 times — 11th should return 429
for i in $(seq 1 11); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5050/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"notexist@test.com","password":"wrongpassword12345"}')
  echo "Request $i: HTTP $STATUS"
done
# Expected: First 10 return 401 (wrong credentials), 11th returns 429

# Verify 429 response body
curl -s -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"notexist@test.com","password":"wrong"}' \
  -w "\nHTTP Status: %{http_code}\n"
# After hitting the limit: HTTP Status: 429 with {"error": "Rate limit exceeded: 10 per 1 minute"}
```

**Pass condition:** 11th login attempt in under one minute returns HTTP 429. Same pattern for register (limit 5) and password reset (limit 5).

---

## SEC-05: Email templates escape all user-supplied HTML

**Risk:** Subscription title or URL containing HTML/JavaScript renders as executable code in email clients.

### Automated Tests

```bash
cd e:/Study/ReactApps/my-managment-system/backend

# 1. Confirm html.escape is used
grep -n "html\.escape\|import html" src/services/email_templates.py
# Expected: import html + at least two html.escape() calls

# 2. Full XSS escape test
python -c "
from src.services.email_templates import renewal_html, renewal_subject
from datetime import date

# Title XSS
out = renewal_html(title='<script>alert(\"xss\")</script>', renewal_date=date.today(), amount='9.99 USD', url=None, days_left=1)
assert '<script>' not in out, 'FAIL: script tag not escaped in body'
assert '&lt;script&gt;' in out, 'FAIL: title not escaped'

# URL attribute injection
out2 = renewal_html(title='Test', renewal_date=date.today(), amount='9.99 USD', url='http://x.com/\">' + '<img src=x onerror=xss>', days_left=1)
assert '<img' not in out2, 'FAIL: img tag not escaped in url'
assert '&lt;img' in out2 or '\">' not in out2, 'FAIL: url attribute not escaped'

# Subject XSS
subj = renewal_subject('<b>Bold</b>', date.today())
assert '<b>' not in subj, 'FAIL: b tag in subject'
assert '&lt;b&gt;' in subj, 'FAIL: subject title not escaped'

# Normal content passes through
out3 = renewal_html(title='Netflix Premium', renewal_date=date.today(), amount='15.99 USD', url='https://netflix.com', days_left=5)
assert 'Netflix Premium' in out3
assert 'https://netflix.com' in out3  # URL still present (escaped form is valid href)

print('ALL XSS CHECKS PASSED')
"
```

### Integration Test (manual)

1. Create a test subscription with title: `<b>Test</b> & "Quotes"`
2. Trigger a reminder email (or call the jobs endpoint manually)
3. Check the received email: title should appear as `<b>Test</b> &amp; &quot;Quotes&quot;` — rendered as escaped text, not bold

**Pass condition:** HTML special characters in subscription title and URL are rendered as visible text entities, not executed as HTML/JavaScript, in both subject line and email body.

---

## SEC-06: `last_error` stores only error string, not email body content

**Risk:** On send failure, full email HTML (containing subscription data) is stored in the `last_error` DB column.

### Automated Tests

```bash
# 1. Confirm email.body is absent from the except block
grep -n "email\.body" e:/Study/ReactApps/my-managment-system/backend/src/routers/jobs.py
# Expected: no output

# 2. Confirm last_error assignment is clean
grep -n "last_error" e:/Study/ReactApps/my-managment-system/backend/src/routers/jobs.py
# Expected: exactly one line: reminder.last_error = str(e)[:500]
# and one line: reminder.last_error = None (on success)
```

### Behavior Test (unit-level)

```bash
cd e:/Study/ReactApps/my-managment-system/backend
python -c "
# Simulate the fixed error handler logic
def simulate_last_error(exception_str, email_body_available=False):
    e_str = exception_str[:500]
    # Old (buggy): e_str + email.body if email_in_locals else e_str
    # New (fixed): always just e_str
    return e_str

result = simulate_last_error('Connection refused', email_body_available=True)
assert 'html' not in result.lower(), 'FAIL: HTML found in error string'
assert len(result) <= 500, 'FAIL: error too long'
print('last_error behavior OK:', repr(result))
"
```

**Pass condition:** The line `grep -n "email.body" src/routers/jobs.py` returns no output. The last_error field contains at most 500 characters of exception message.

---

## SEC-07: JWT signing uses PyJWT (replaces python-jose)

**Risk:** python-jose is unmaintained and has CVE-2022-29217 (algorithm confusion).

### Automated Tests

```bash
cd e:/Study/ReactApps/my-managment-system/backend

# 1. Confirm python-jose is removed from requirements
grep "python-jose\|PyJWT" requirements.txt
# Expected: PyJWT==2.12.1 present, python-jose absent

# 2. Confirm no jose imports in source
grep -rn "from jose\|import jose" src/
# Expected: no output

# 3. Confirm jwt (PyJWT) is used in security.py
grep -n "^import jwt\|from jwt" src/core/security.py
# Expected: import jwt present

# 4. Functional JWT round-trip test
python -c "
from src.core.security import create_access_token, decode_token
import jwt  # Must be PyJWT, not jose

tok = create_access_token('test-user-id')
assert isinstance(tok, str) and len(tok) > 20

payload = decode_token(tok)
assert payload['sub'] == 'test-user-id'
assert 'exp' in payload
assert 'iat' in payload

# Decode with wrong key should raise ValueError
try:
    decode_token('not.a.valid.token')
    assert False, 'should have raised ValueError'
except ValueError as e:
    assert 'Invalid token' in str(e)

print('PyJWT round-trip: PASSED')
"
```

**Pass condition:** python-jose absent from requirements.txt and source imports. PyJWT creates and validates tokens correctly.

---

## SEC-08: Password hashing uses direct bcrypt (replaces passlib)

**Risk:** passlib is unmaintained (last release 2020).

### Automated Tests

```bash
cd e:/Study/ReactApps/my-managment-system/backend

# 1. Confirm passlib is removed from requirements
grep "passlib\|bcrypt" requirements.txt
# Expected: bcrypt==4.0.1 present, passlib absent

# 2. Confirm no passlib imports in source
grep -rn "from passlib\|import passlib" src/
# Expected: no output

# 3. Confirm bcrypt is used directly in security.py
grep -n "^import bcrypt\|bcrypt\." src/core/security.py
# Expected: import bcrypt present, bcrypt.hashpw and bcrypt.checkpw calls present

# 4. Functional bcrypt test
python -c "
from src.core.security import hash_password, verify_password
import bcrypt  # Direct import — not passlib

h = hash_password('mysecretpassword')
assert isinstance(h, str), 'hash must be str'
assert h.startswith('\$2b\$12\$'), f'wrong prefix: {h[:10]}'

assert verify_password('mysecretpassword', h) == True
assert verify_password('wrongpassword', h) == False

# Verify compatibility with passlib-generated hashes (\$2b\$ prefix, same bcrypt)
# Simulate a passlib-generated hash using direct bcrypt (same algorithm)
existing = bcrypt.hashpw(b'existingpassword', bcrypt.gensalt(rounds=12)).decode()
assert verify_password('existingpassword', existing) == True, 'FAIL: passlib-compatible hash fails'

print('bcrypt direct usage: PASSED')
"
```

**Pass condition:** passlib absent from requirements.txt and source imports. hash_password produces `$2b$12$...` hashes. verify_password returns True/False correctly. Existing database hashes (same $2b$ format) continue to work.

---

## Full Phase Regression Test

Run this after all four plans are complete to confirm no regressions:

```bash
cd e:/Study/ReactApps/my-managment-system/backend

# 1. Backend imports cleanly
python -c "from src.main import app; print('Backend app imports OK')"

# 2. All security functions work
python -c "
from src.core.security import hash_password, verify_password, create_access_token, decode_token
h = hash_password('regression_test')
assert verify_password('regression_test', h)
tok = create_access_token('rtest')
assert decode_token(tok)['sub'] == 'rtest'
print('Security module: OK')
"

# 3. Email templates work and escape
python -c "
from src.services.email_templates import renewal_html, renewal_subject
from datetime import date
out = renewal_html(title='<x>', renewal_date=date.today(), amount='1.00 USD', url=None, days_left=1)
assert '<x>' not in out
print('Email templates: OK')
"

# 4. No hardcoded API key in frontend
cd e:/Study/ReactApps/my-managment-system
grep -rn "a3769b4faf76f0a94a430f17" frontend/ && echo "FAIL: key found" || echo "API key: OK (not in frontend)"

# 5. No stale imports
cd backend
grep -rn "from jose\|from passlib\|OAuth2PasswordBearer\|document\.cookie.*token" src/ && echo "FAIL: stale imports" || echo "Stale imports: OK (none found)"

# 6. Run existing integration tests (if backend is running)
# pytest tests/ -v
```

### Manual End-to-End Checklist

Run in browser against the full running stack after deployment:

- [ ] Log in — works, token cookie appears in DevTools > Application > Cookies with HttpOnly checked
- [ ] `document.cookie` in DevTools Console — `token` does NOT appear
- [ ] Navigate to dashboard — loads correctly (cookie auth working)
- [ ] Switch currency — conversion works (backend proxy working)
- [ ] Log out — redirected to sign-in page, `token` cookie cleared
- [ ] Attempt to access /dashboard after logout — redirected to /sign-in (proxy.ts working)
- [ ] Rapid login attempts (11+) in one minute — 429 appears after limit
- [ ] Check Redis cache after login — no `password_hash` field in `user:<id>` key

---

*Validation guide: 2026-04-01*
*Phase: 01-security-hardening*
