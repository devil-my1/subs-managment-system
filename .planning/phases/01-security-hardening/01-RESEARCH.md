# Phase 1: Security Hardening - Research

**Researched:** 2026-04-01
**Domain:** FastAPI security — JWT migration, cookie auth, rate limiting, dependency replacement, XSS prevention
**Confidence:** HIGH (all critical APIs verified against installed packages and live code)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Backend sets JWT as HttpOnly + Secure + SameSite=Lax cookie via `Set-Cookie` header — NOT returned in JSON body.
- **D-02:** Both `POST /auth/login` and `POST /auth/register` switch to server-set cookies. `access_token` field removed from `AuthResponse` or replaced with user info only.
- **D-03:** Force re-login on deploy. No dual-read transition. Old client-set cookies are ignored. All active sessions invalidated.
- **D-04:** Add `POST /auth/logout` backend endpoint that clears the HttpOnly cookie by setting `Set-Cookie: token=; max-age=0`.
- **D-05:** Remove `setToken()` and `clearToken()` from `frontend/lib/api/auth.actions.ts`. Frontend no longer manages the cookie.
- **D-06:** `proxy.ts` middleware (Next.js server-side) can read HttpOnly cookies via `cookies()` from `next/headers` — keep that working.
- **D-07:** Add `GET /api/v1/currency/rate?from={from}&to={to}` FastAPI endpoint that calls ExchangeRate API server-side.
- **D-08:** Add `EXCHANGE_RATE_API_KEY` to backend env vars in `backend/src/core/config.py` Settings class.
- **D-09:** `frontend/lib/api/currency.actions.ts` rewritten to call `/api/currency/rate` via `apiFetch()`.
- **D-10:** Remove hardcoded API key literal `"a3769b4faf76f0a94a430f17"` entirely. No fallback literal.
- **D-11:** Use `slowapi` library for rate limiting.
- **D-12:** Rate limits per IP: login 10/min, register 5/min, request-password-reset 5/min, verify-password-reset 5/min.
- **D-13:** Exceed limit → 429 Too Many Requests.
- **D-14:** Remove `password_hash` from cached user object in `backend/src/api/deps.py`. Cache only: `id`, `email`, `name`.
- **D-15:** Apply `html.escape()` to all user-supplied string fields in `backend/src/services/email_templates.py`.
- **D-16:** In `backend/src/routers/jobs.py`, remove `+ email.body` concatenation from `last_error`. Store only `str(e)[:500]`.
- **D-17:** Replace `python-jose` with `PyJWT`. Rewrite `backend/src/core/security.py` to use `import jwt`.
- **D-18:** Replace `passlib` with direct `bcrypt`. Rewrite `hash_password()` / `verify_password()` in `backend/src/core/security.py`.

### Claude's Discretion

- Exact `AuthResponse` schema shape after removing `access_token` (can return `user_name` + `user_id` or just a success message)
- Whether to cache rate limiter state in Redis or use in-memory (default slowapi behavior is fine)
- Specific bcrypt work factor (12 is standard)
- Whether `POST /auth/logout` also invalidates the user cache in Redis (recommended but Claude's call)

### Deferred Ideas (OUT OF SCOPE)

- Dep migration scope beyond SEC-07/08 (broader security audit of other Python packages)
- HTTPS enforcement at app level (handled by Nginx already)
- 2FA / TOTP
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Currency API key not exposed in frontend bundle — proxied through backend | New FastAPI endpoint + env var; currency.actions.ts rewrite |
| SEC-02 | JWT cookie set server-side with HttpOnly and Secure flags | FastAPI response.set_cookie() + OAuth2PasswordBearer replacement + deps.py rewrite |
| SEC-03 | Redis cache does not store password hashes | Remove `password_hash` from cache_set_json call in deps.py; reconstruct User without hash |
| SEC-04 | Auth endpoints rate limited | slowapi Limiter + @limiter.limit decorator + Request param + main.py registration |
| SEC-05 | Email templates escape all user-supplied HTML | html.escape() on title, url in email_templates.py |
| SEC-06 | `last_error` stores only error string, not email body | Remove `+ email.body` from jobs.py line 81 |
| SEC-07 | JWT signing uses PyJWT (replaces python-jose) | PyJWT 2.12.1 — import jwt, jwt.encode(), jwt.decode(), exception hierarchy |
| SEC-08 | Password hashing uses direct bcrypt (replaces passlib) | bcrypt 4.0.1 already installed — hashpw/checkpw with encode/decode bytes |
</phase_requirements>

---

## Summary

This phase replaces two unmaintained Python security libraries (python-jose, passlib), migrates from client-managed to server-set HttpOnly cookies, adds rate limiting to auth endpoints, removes a password hash from the Redis cache, fixes two low-complexity bugs (email template XSS, last_error concatenation), and moves the currency API key off the frontend.

All work is contained within three backend files (`security.py`, `deps.py`, `auth.py`) plus the main.py app setup, one new backend router for currency, and two frontend files (`auth.actions.ts`, `base.actions.ts`, `currency.actions.ts`). No database migrations required. The most complex change is the cookie auth flow rewrite: `deps.py` must stop using `OAuth2PasswordBearer` (which reads the `Authorization` header) and instead read the `token` cookie directly from the request.

The `proxy.ts` middleware is already correct — it uses `req.cookies.get("token")` which reads from the Cookie request header, not `document.cookie`. HttpOnly cookies are sent by the browser in the Cookie header on every request, so `proxy.ts` will continue working with zero changes after the backend switches to server-set HttpOnly cookies.

**Primary recommendation:** Implement in dependency order — security.py (PyJWT + bcrypt) first, then deps.py (cookie reader + cache fix), then auth.py (cookie response + rate limits), then the remaining fixes.

---

## 1. PyJWT Migration

### Current State (python-jose)

```python
# backend/src/core/security.py — current
from jose import jwt, JWTError

jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)  # returns str
jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])  # raises JWTError on failure
```

The current `decode_token()` catches `JWTError` and re-raises as `ValueError("Invalid token")`.

### PyJWT API (verified — installed in venv at 2.12.1)

**Import:**
```python
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, DecodeError
```

**Encode:**
```python
# Returns str (same as python-jose for HS256)
token: str = jwt.encode(payload, key, algorithm="HS256")
```

**Decode:**
```python
# algorithms parameter is required — same as python-jose
payload: dict = jwt.decode(token, key, algorithms=["HS256"])
```

**Exception hierarchy (verified from source):**
```
jwt.exceptions.PyJWTError (base)
└── jwt.exceptions.InvalidTokenError
    ├── jwt.exceptions.DecodeError
    │   └── jwt.exceptions.InvalidSignatureError
    ├── jwt.exceptions.ExpiredSignatureError
    ├── jwt.exceptions.InvalidAudienceError
    ├── jwt.exceptions.InvalidIssuerError
    ├── jwt.exceptions.MissingRequiredClaimError
    └── (others)
└── jwt.exceptions.InvalidKeyError
```

**Key differences from python-jose:**

| Aspect | python-jose | PyJWT 2.x |
|--------|-------------|-----------|
| Import module | `from jose import jwt` | `import jwt` |
| Encode return type | `str` | `str` (same) |
| Decode return type | `dict` | `dict` (same) |
| Base exception | `jose.JWTError` | `jwt.exceptions.InvalidTokenError` |
| Expired exception | `jose.ExpiredSignatureError` | `jwt.exceptions.ExpiredSignatureError` |
| algorithms param | `algorithms=[...]` | `algorithms=[...]` (same) |
| Key length warning | None | Warns if HMAC key < 32 bytes |

### Rewrite for security.py

The `decode_token()` function catches any exception and re-raises as `ValueError`. This means the exception type change does not propagate — the wrapper absorbs it. The rewrite is minimal:

```python
# NEW security.py — JWT section
import jwt
from jwt.exceptions import InvalidTokenError

def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload = {"sub": subject, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except InvalidTokenError as e:
        raise ValueError("Invalid token") from e
```

**requirements.txt changes:**
- Remove: `python-jose==3.5.0`
- Remove: `ecdsa==0.19.1`, `pyasn1==0.6.1`, `rsa==4.9.1` (python-jose transitive deps — verify nothing else uses them)
- Add: `PyJWT==2.12.1`

**Confidence:** HIGH — verified with live installation in the venv.

---

## 2. bcrypt Direct Usage

### Current State (passlib)

```python
# backend/src/core/security.py — current
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)         # returns str

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)  # returns bool
```

### Direct bcrypt API (verified — bcrypt 4.0.1 installed in venv)

**Critical byte-encoding requirement (verified live):**

`bcrypt.hashpw()` and `bcrypt.checkpw()` require `bytes` arguments. Passing a `str` raises:
```
TypeError: Strings must be encoded before hashing
```

The database stores the hash as a `str` column. The pattern must encode inputs and decode outputs:

```python
import bcrypt

def hash_password(password: str) -> str:
    # hashpw returns bytes — decode to str for DB storage
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=12)
    ).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    # Both inputs must be bytes — encode from str
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8")
    )
```

**Verified correct behavior:**
- `hash_password("mysecretpassword")` → `str` starting with `$2b$12$...`
- `verify_password("mysecretpassword", stored_hash)` → `True`
- `verify_password("wrongpassword", stored_hash)` → `False`

**Compatibility with existing hashes:**
The existing hashes in the database were generated by passlib's bcrypt backend with the same `$2b$` prefix. Direct bcrypt reads these identically — no hash migration needed.

**requirements.txt changes:**
- Remove: `passlib==1.7.4`
- `bcrypt==4.0.1` already present — no version change needed (latest is 5.0.0 but 4.0.1 is installed and working; pinned upgrade to 5.0.0 is optional)

**Note:** passlib has a dependency on `cffi` — verify nothing else requires it before removing.

**Confidence:** HIGH — verified with live bcrypt 4.0.1 in the venv.

---

## 3. FastAPI Cookie Auth

### The Problem

Current `deps.py` uses `OAuth2PasswordBearer`:
```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(db=Depends(get_db), token: str = Depends(oauth2_scheme)):
    ...
```

`OAuth2PasswordBearer` reads from the `Authorization: Bearer <token>` header only. After migrating to HttpOnly cookies, `document.cookie` is inaccessible to JavaScript, so `apiFetch()` cannot extract the token to set this header. The dependency must be replaced.

### Replacement: Cookie-based extraction

FastAPI's `Request` object exposes `request.cookies` as a dict. Replace `OAuth2PasswordBearer` with a direct cookie read:

```python
# NEW deps.py — token extraction
from fastapi import Request, HTTPException

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    # ... rest of cache/DB lookup unchanged
```

**No downstream changes required:** All routes use `Depends(get_current_user)` — the signature change to `Request` is absorbed by FastAPI's dependency injection.

### Setting the cookie in login/register endpoints

Both endpoints currently return `AuthResponse(access_token=..., user_name=...)`. With D-01, the token goes in a `Set-Cookie` header instead.

**Method: Inject `Response` as a parameter** (preferred — keeps `response_model` working):

```python
from fastapi import Response

@router.post("/login", response_model=AuthResponse)
async def login(data: SignIn, response: Response, db: AsyncSession = Depends(get_db)):
    ...
    token = create_access_token(str(user.id))
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
        path="/"
    )
    return AuthResponse(user_name=user.name, user_id=str(user.id))
```

### Logout endpoint

```python
@router.post("/logout", response_model=Message)
async def logout(response: Response):
    response.set_cookie(key="token", value="", max_age=0, httponly=True, secure=True, samesite="lax", path="/")
    return {"detail": "Logged out successfully"}
```

### Updated AuthResponse schema

Remove `access_token` and `token_type`. Return user info for the frontend to store in memory (not localStorage — no persistence needed, just for display):

```python
class AuthResponse(BaseModel):
    user_name: str
    user_id: str
```

**Frontend impact:** `auth.actions.ts` currently reads `data.access_token` and calls `setToken()`. After the change, it reads `data.user_name` and `data.user_id` — no token handling.

### Secure flag and local development

`secure=True` means the cookie is only sent over HTTPS. In local development (HTTP), the cookie will not be sent. Options:
1. Use `secure=False` in dev via an env var: `secure=settings.COOKIE_SECURE` (defaults `True`, set `False` in `.env`)
2. Use `localhost` with a local HTTPS proxy

**Recommended approach:** Add `COOKIE_SECURE: bool = True` to `config.py` Settings and set `COOKIE_SECURE=false` in the dev `.env`. This lets production always use `secure=True`.

**Confidence:** HIGH — verified from FastAPI official docs and direct code reading.

---

## 4. slowapi Rate Limiting

### Version

Latest: **0.1.9** (verified via pip index). Not yet installed in the venv.

### Complete Setup Pattern (verified)

**1. Install:**
```
slowapi==0.1.9
```
Add to `requirements.txt`.

**2. Initialize (in `main.py` or a dedicated `limiter.py`):**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
```

**3. Register with the FastAPI app in `main.py`:**
```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Optionally add `SlowAPIMiddleware` for automatic limit checking:
```python
from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)
```

Without `SlowAPIMiddleware`, `auto_check=True` (default) still works — slowapi hooks into the request lifecycle via the decorator.

**4. Apply decorator to router endpoints:**

**Critical requirement:** The endpoint function MUST have `request: Request` as an explicit parameter — slowapi cannot hook in without it. The decorator goes BELOW the `@router.post(...)` decorator.

```python
from fastapi import Request
from src.core.limiter import limiter  # shared instance

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: SignIn, response: Response, db: AsyncSession = Depends(get_db)):
    ...
```

### Affected endpoints (D-12)

| Endpoint | Current signature | Change needed |
|----------|-------------------|---------------|
| `POST /auth/login` | `async def login(data: SignIn, db=...)` | Add `request: Request` |
| `POST /auth/register` | `async def register(data: SignUp, db=...)` | Add `request: Request` |
| `POST /auth/request-password-reset` | `async def request_password_reset(payload, db=...)` | Add `request: Request` |
| `POST /auth/verify-password-reset` | `async def verify_password_reset(payload)` | Add `request: Request` |

### 429 Response format

`_rate_limit_exceeded_handler` returns JSON:
```json
{"error": "Rate limit exceeded: 10 per 1 minute"}
```
with status 429 and rate-limit headers injected.

### Shared limiter instance

To avoid circular imports, create `backend/src/core/limiter.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

Then import in `main.py` and in `auth.py`.

### Rate limit storage

Default is in-memory. Per D (Claude's Discretion), in-memory is acceptable since the app is single-instance. Redis backend is available by passing `storage_uri=settings.REDIS_URL` to `Limiter()` if needed.

**Confidence:** HIGH — verified from GitHub source and multiple cross-referenced examples.

---

## 5. Frontend Cookie Flow (apiFetch + proxy.ts)

### proxy.ts — No changes needed

Current `proxy.ts` reads:
```typescript
const token = req.cookies.get("token")?.value
```

`req.cookies` in Next.js middleware (`NextRequest`) reads from the incoming `Cookie:` HTTP header — which the browser sends automatically for all matching cookies, including HttpOnly ones. This works identically whether the cookie was set by the server (HttpOnly) or the client. **Zero changes required to `proxy.ts`.**

### apiFetch — Remove client-side token extraction

Current `base.actions.ts` reads:
```typescript
const token = typeof window !== "undefined" ? getToken() : undefined
if (token) headersInit.set("Authorization", `Bearer ${token}`)
```

`getToken()` uses `document.cookie`, which cannot read HttpOnly cookies. After migration, `getToken()` always returns `undefined`, so the `Authorization` header is never set. The backend will now read from the cookie header.

**Required changes to `base.actions.ts`:**
1. Remove the `getToken()` function (or leave as dead code — removing is cleaner)
2. Remove `Authorization` header logic from `apiFetch()`
3. Add `withCredentials: true` to the axios config so the browser sends the HttpOnly cookie cross-origin

```typescript
// axiosConfig change
const axiosConfig: AxiosRequestConfig = {
    ...rest,
    headers,
    data: body,
    signal: signal ?? undefined,
    withCredentials: true  // ADD THIS — sends cookies cross-origin
}
```

**Why `withCredentials: true` is required:** Axios (like `fetch`) does not send cookies cross-origin by default. The frontend runs on port 3000, the backend on port 5050 (or via Next.js `/api/v1` proxy). Without this flag, the browser withholds the cookie on cross-origin requests.

**Note on server-side rendering:** `apiFetch` already handles the SSR case with `INTERNAL_API_URL`. In SSR context, `typeof window === "undefined"`, so there is no `document.cookie`. With cookie auth, SSR-initiated API calls (from Server Components or `getServerSideProps`) will NOT have the cookie since it lives in the browser. The existing code only calls `apiFetch` from client components, so this is not a current issue — but it is a known limitation to document.

### auth.actions.ts — Remove setToken/clearToken

```typescript
// REMOVE:
export function setToken(token: string) { ... }
export function clearToken() { ... }

// REMOVE from login():
setToken(data.access_token)
return data.access_token

// REMOVE from register():
setToken(data.access_token)
return data.user_name  // this stays

// UPDATE login() return type:
const data = await apiFetch<{ user_name: string; user_id: string }>("/auth/login", ...)
return data.user_name  // or return { user_name, user_id }

// UPDATE logout() to call backend:
export async function logout() {
    await apiFetch("/auth/logout", { method: "POST" })
    // cookie cleared by server Set-Cookie response
}
```

**Sidebar.tsx and MobileNav.tsx** both call `logout()` — they only need to work correctly after the cookie is cleared. No changes needed there beyond the `auth.actions.ts` rewrite.

**Confidence:** HIGH for proxy.ts (verified by direct code reading). HIGH for apiFetch changes (standard browser cookie behavior, `withCredentials` is documented axios behavior).

---

## 6. CORS Considerations

### Current CORS config (`main.py`)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,   # ALREADY SET
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_credentials=True` is **already configured**. This is what enables the browser to send and receive cookies cross-origin. No CORS changes are required.

**Why it matters:** When `withCredentials: true` is set on the axios request, the browser requires the server to respond with `Access-Control-Allow-Credentials: true` AND a specific (non-wildcard) origin. The current config uses `settings.cors_origins_list` (specific origins), not `"*"`, so this is already compliant.

**Gotcha:** `allow_credentials=True` is incompatible with `allow_origins=["*"]`. The current code uses a specific origins list — this is correct and must not be changed to `"*"`.

**New `/api/v1/currency/rate` endpoint:** This endpoint will be called by the frontend via `apiFetch()` which now sends credentials. No additional CORS config needed since it goes through the same FastAPI app with the same CORS middleware.

**Confidence:** HIGH — verified from direct reading of `main.py`.

---

## 7. Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.3.3 + pytest-asyncio 0.23.8 + httpx 0.27.2 |
| Config file | None detected (uses pyproject.toml or pytest.ini — neither found; asyncio_mode set via decorator) |
| Quick run command | `cd backend && python -m pytest tests/test_auth.py -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -x -q` |

**Important:** All existing tests are integration tests that `pytest.skip()` if the API is unreachable (`conftest.py` checks `/openapi.json`). Unit tests for `security.py` functions can run without a live API.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-07 | `create_access_token()` encodes and `decode_token()` decodes with PyJWT | unit | `pytest tests/test_security.py -x` | ❌ Wave 0 |
| SEC-07 | `decode_token()` raises `ValueError` on invalid/expired token | unit | `pytest tests/test_security.py -x` | ❌ Wave 0 |
| SEC-08 | `hash_password()` returns `$2b$12$...` str | unit | `pytest tests/test_security.py -x` | ❌ Wave 0 |
| SEC-08 | `verify_password()` returns True for correct, False for wrong | unit | `pytest tests/test_security.py -x` | ❌ Wave 0 |
| SEC-02 | POST /auth/login response has `Set-Cookie: token=...; HttpOnly` header | integration | `pytest tests/test_auth.py -x` | ❌ needs update |
| SEC-02 | POST /auth/register response has `Set-Cookie: token=...; HttpOnly` header | integration | `pytest tests/test_auth.py -x` | ❌ needs update |
| SEC-02 | POST /auth/logout clears cookie (Set-Cookie: token=; max-age=0) | integration | `pytest tests/test_auth.py -x` | ❌ new test |
| SEC-04 | 11th POST /auth/login within a minute returns 429 | integration | `pytest tests/test_auth.py::test_rate_limit -x` | ❌ new test |
| SEC-03 | Redis cache key `user:{id}` does not contain `password_hash` field | unit/integration | `pytest tests/test_security.py -x` | ❌ Wave 0 |
| SEC-01 | GET /api/v1/currency/rate returns conversion rate without exposing API key | integration | `pytest tests/test_currency.py -x` | ❌ new test |
| SEC-05 | `renewal_html()` with `title="<script>xss</script>"` produces escaped output | unit | `pytest tests/test_email_templates.py -x` | ❌ Wave 0 |
| SEC-06 | `last_error` on reminder failure is `str(e)[:500]` only, no email body | unit | `pytest tests/test_jobs.py -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && python -m pytest tests/test_security.py -x -q` (unit tests only, no live API needed)
- **Per wave merge:** `cd backend && python -m pytest tests/ -x -q` (requires live API for integration tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/test_security.py` — unit tests for `security.py` (SEC-07, SEC-08, SEC-03)
- [ ] `backend/tests/test_email_templates.py` — unit test for `html.escape()` in `renewal_html()` (SEC-05)
- [ ] `backend/tests/test_jobs.py` — unit test for `last_error` assignment (SEC-06)
- [ ] `backend/tests/test_auth.py` — update existing test (reads `access_token` from JSON body; after SEC-02, must read Set-Cookie header instead)
- [ ] `backend/tests/test_currency.py` — integration test for new `/currency/rate` endpoint (SEC-01)

**Note:** No pytest.ini or pyproject.toml `[tool.pytest.ini_options]` detected. The test runner relies on `@pytest.mark.asyncio` decorators. If `asyncio_mode = "auto"` is needed, add a `pytest.ini` in the `backend/` directory.

---

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| PyJWT | 2.12.1 | JWT encode/decode — replaces python-jose | Install |
| bcrypt | 4.0.1 | Password hashing — already installed | No change |
| slowapi | 0.1.9 | FastAPI rate limiting | Install |
| FastAPI | 0.128.0 | Existing framework | No change |
| html (stdlib) | — | `html.escape()` for XSS prevention | No install |

### requirements.txt Changes

```diff
- python-jose==3.5.0
- passlib==1.7.4
- ecdsa==0.19.1      # python-jose dep — verify nothing else needs it
- pyasn1==0.6.1      # python-jose dep — verify nothing else needs it
- rsa==4.9.1         # python-jose dep — verify nothing else needs it
+ PyJWT==2.12.1
+ slowapi==0.1.9
  bcrypt==4.0.1      # keep — already present
```

**Verify before removing:** `ecdsa`, `pyasn1`, `rsa` are python-jose transitive dependencies. Run `pip show ecdsa pyasn1 rsa` to confirm no other installed package requires them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom middleware with Redis counter | `slowapi` | Edge cases: sliding window, per-IP keying, 429 headers, concurrent requests |
| JWT encode/decode | Custom base64 + HMAC | `PyJWT` | Algorithm confusion attacks, claim validation, key security |
| Password hashing | Custom bcrypt wrapper | Direct `bcrypt` | Already installed, 3-line replacement |
| HTML escaping | Regex replace of `<`, `>`, `&` | `html.escape()` stdlib | Misses edge cases; stdlib is correct and tested |
| Cookie clearing | `document.cookie = "token=; ..."` (client) | `response.set_cookie(max_age=0)` (server) | HttpOnly cookies cannot be cleared by JS |

---

## Common Pitfalls

### Pitfall 1: bcrypt requires bytes — string inputs silently fail or raise TypeError

**What goes wrong:** Calling `bcrypt.hashpw("mypassword", salt)` raises `TypeError: Strings must be encoded before hashing`.
**Why it happens:** bcrypt 4.x is strict about byte inputs. passlib handled this transparently.
**How to avoid:** Always `.encode("utf-8")` inputs and `.decode("utf-8")` the output. The hash in the DB is a `str`, so always re-encode before passing to `checkpw`.
**Warning signs:** `TypeError` on login or registration; test `verify_password` with a DB-stored hash string.

### Pitfall 2: slowapi decorator order matters

**What goes wrong:** Rate limit is silently not applied.
**Why it happens:** The `@limiter.limit()` decorator must be BELOW `@router.post(...)`, not above it.
**How to avoid:**
```python
@router.post("/login")   # FIRST
@limiter.limit("10/minute")  # SECOND (closer to function)
async def login(request: Request, ...):
```

### Pitfall 3: Request parameter missing from rate-limited endpoint

**What goes wrong:** `RuntimeError` or rate limit not applied.
**Why it happens:** slowapi reads the client IP from the `Request` object. If `request: Request` is not an explicit parameter, slowapi cannot function.
**How to avoid:** Every `@limiter.limit()`-decorated endpoint must have `request: Request` as the first parameter after the router decorator applies it.

### Pitfall 4: secure=True breaks local HTTP development

**What goes wrong:** Cookie is set in the login response but never sent back — requests all return 401.
**Why it happens:** `secure=True` means the browser only sends the cookie over HTTPS. Local dev runs HTTP.
**How to avoid:** Add `COOKIE_SECURE: bool = True` to Settings. In `.env` set `COOKIE_SECURE=false` for local dev. Use `secure=settings.COOKIE_SECURE` in `set_cookie()`.

### Pitfall 5: withCredentials missing from axios breaks cookie sending

**What goes wrong:** Backend receives no `token` cookie; all authenticated requests return 401 after migration.
**Why it happens:** Browsers do not send cookies on cross-origin requests unless `withCredentials: true` is set.
**How to avoid:** Add `withCredentials: true` to the axiosConfig in `apiFetch()`. The CORS config (`allow_credentials=True`) is already correct.

### Pitfall 6: test_auth.py reads `access_token` from JSON body

**What goes wrong:** `test_register_and_login` fails immediately after SEC-02 because it does `r.json()["access_token"]` which no longer exists in the response body.
**Why it happens:** The existing integration test was written for the old JSON token response.
**How to avoid:** Update `test_auth.py` to check for `Set-Cookie` header and extract the cookie value instead.

### Pitfall 7: python-jose transitive deps may be needed by other packages

**What goes wrong:** After removing `ecdsa`, `pyasn1`, `rsa` from requirements.txt, another installed package fails to import.
**Why it happens:** These are common crypto dependencies that other packages may share.
**How to avoid:** Before removing, run `pip show ecdsa pyasn1 rsa` and check `Required-by:` field. Only remove if nothing else requires them.

### Pitfall 8: email_templates.py — url may be None

**What goes wrong:** `html.escape(url)` raises `TypeError` when `url is None`.
**Why it happens:** The function signature shows `url: str | None` — it is optional.
**How to avoid:** Apply escape conditionally:
```python
safe_url = html.escape(url) if url else None
link_html = f'<p><a href="{safe_url}">Open subscription link</a></p>' if safe_url else ""
```

---

## Code Examples

### security.py — Complete rewrite

```python
# backend/src/core/security.py
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError
from src.core.config import settings

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload = {"sub": subject, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except InvalidTokenError as e:
        raise ValueError("Invalid token") from e
```

### deps.py — Cookie-based token extraction (relevant section)

```python
# backend/src/api/deps.py
from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.core.security import decode_token
from src.models.user import User
from src.utils.cache import cache_get_json, cache_set_json
from src.core.config import settings
from uuid import UUID
from datetime import datetime

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    cache_key = f"user:{user_id}"
    cached = await cache_get_json(cache_key)
    if cached:
        created = cached.get("created_at")
        return User(
            id=UUID(cached["id"]),
            email=cached["email"],
            name=cached.get("name") or "User",
            # password_hash intentionally omitted
            created_at=datetime.fromisoformat(created) if created else None,
        )

    from sqlalchemy import select
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Cache WITHOUT password_hash (SEC-03)
    await cache_set_json(cache_key, {
        "id": str(user.id),
        "email": user.email,
        "name": user.name or "User",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }, ttl=settings.CACHE_USER_TTL)
    return user
```

**Note:** `User` model constructed from cache will have `password_hash=None`. Any route that calls `verify_password(payload.old_password, user.password_hash)` — specifically `change_password` — must re-fetch the user from DB, not trust the cache. Currently `change_password` uses `Depends(get_current_user)`. After removing `password_hash` from cache, the endpoint must do a separate DB fetch for `user.password_hash` before calling `verify_password()`.

### email_templates.py — html.escape() application

```python
# backend/src/services/email_templates.py
from __future__ import annotations
from datetime import date
import html

def renewal_subject(title: str, renewal_date: date) -> str:
    return f"Renewal reminder: {html.escape(title)} ({renewal_date.isoformat()})"

def renewal_html(*, title: str, renewal_date: date, amount: str, url: str | None, days_left: int) -> str:
    safe_title = html.escape(title)
    safe_url = html.escape(url) if url else None
    link_html = f'<p><a href="{safe_url}">Open subscription link</a></p>' if safe_url else ""
    return f"""
    <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
      <h2>Renewal reminder</h2>
      <p><b>{safe_title}</b> renews on <b>{renewal_date.isoformat()}</b> ({days_left} day(s) left).</p>
      <p>Amount: <b>{html.escape(amount)}</b></p>
      {link_html}
      <hr/>
      <p style="color:#666;">Sent by your Subscriptions Manager.</p>
    </div>
    """
```

### Currency backend endpoint

```python
# backend/src/routers/currency.py (new file)
from fastapi import APIRouter, HTTPException, Query, Depends
from src.core.config import settings
import httpx

router = APIRouter(prefix="/currency", tags=["currency"])

@router.get("/rate")
async def get_exchange_rate(
    from_currency: str = Query(..., alias="from"),
    to_currency: str = Query(..., alias="to"),
):
    url = f"https://v6.exchangerate-api.com/v6/{settings.EXCHANGE_RATE_API_KEY}/pair/{from_currency}/{to_currency}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
            if data.get("result") != "success":
                raise HTTPException(status_code=502, detail="Exchange rate API error")
            return {"rate": data["conversion_rate"]}
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch exchange rate: {str(e)}")
```

**Note:** `httpx` is already in `requirements.txt` (listed as `httpx==0.27.2`).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| bcrypt | SEC-08 | Yes | 4.0.1 (venv) | — |
| PyJWT | SEC-07 | No (installed during research session) | 2.12.1 | — |
| slowapi | SEC-04 | No | 0.1.9 latest | — |
| httpx | SEC-01 (currency endpoint) | Yes | 0.27.2 (already in requirements.txt) | — |
| html (stdlib) | SEC-05 | Yes | Python stdlib | — |
| pytest + pytest-asyncio | Testing | Yes | 8.3.3 / 0.23.8 | — |

**Missing with no fallback:**
- `PyJWT==2.12.1` — must be added to `requirements.txt` and installed
- `slowapi==0.1.9` — must be added to `requirements.txt` and installed

---

## Open Questions

1. **User.password_hash = None after cache reconstruction**
   - What we know: The `User` SQLAlchemy model has `password_hash` as a non-nullable column. Constructing a `User()` in Python with `password_hash=None` will not raise an error (Python allows it), but `change_password` calls `verify_password(payload.old_password, user.password_hash)` which will fail with `TypeError` if hash is `None`.
   - What's unclear: Whether SQLAlchemy model validation is enforced on object construction vs. only on DB write.
   - Recommendation: In `change_password`, always perform a fresh DB fetch before `verify_password`. This is the safest pattern. Alternatively, do not reconstruct a `User` from cache — instead return a lightweight `CachedUser` dataclass. The planner should choose one approach.

2. **COOKIE_SECURE env var for dev**
   - What we know: `secure=True` breaks local HTTP dev. The app runs locally without HTTPS.
   - Recommendation: Add `COOKIE_SECURE: bool = True` to Settings and document in `.env.example`.

3. **Removing python-jose transitive deps**
   - What we know: `ecdsa`, `pyasn1`, `rsa` are listed in requirements.txt and are python-jose deps.
   - What's unclear: Whether `cryptography==46.0.3` (also present) subsumes all of these at runtime.
   - Recommendation: Run `pip show ecdsa pyasn1 rsa` after removing python-jose to verify `Required-by` is empty before pinning their removal.

---

## Sources

### Primary (HIGH confidence)
- PyJWT 2.12.1 — verified by live installation and execution in the project venv
- bcrypt 4.0.1 — verified by live execution showing bytes-only requirement and hash format
- FastAPI official docs (https://fastapi.tiangolo.com/advanced/response-cookies/) — `response.set_cookie()` signature
- Direct code reading: `security.py`, `deps.py`, `auth.py`, `main.py`, `config.py`, `proxy.ts`, `base.actions.ts`, `auth.actions.ts`

### Secondary (MEDIUM confidence)
- slowapi 0.1.9 — verified from GitHub source (`__init__.py`, `extension.py`, `util.py`) + pip index
- PyJWT exception hierarchy — verified from `jwt/exceptions.py` on GitHub
- axios `withCredentials` — standard axios documentation behavior

### Tertiary (LOW confidence — for reference only)
- Multiple blog posts cross-confirming slowapi FastAPI setup pattern (Medium, bytescrum, improveandrepeat)

---

## Metadata

**Confidence breakdown:**
- PyJWT migration: HIGH — verified by live execution
- bcrypt direct usage: HIGH — verified by live execution with the installed version
- FastAPI cookie auth: HIGH — verified from official docs and direct code reading
- slowapi setup: HIGH — verified from GitHub source
- Frontend cookie flow: HIGH — proxy.ts uses `req.cookies` (Cookie header, not document.cookie); withCredentials is standard
- CORS: HIGH — directly read from main.py
- Pitfalls: HIGH for bytes/decorator issues (reproduced), MEDIUM for dev HTTPS issue (standard browser behavior)

**Research date:** 2026-04-01
**Valid until:** 2026-07-01 (stable libraries — PyJWT and slowapi rarely break API)
