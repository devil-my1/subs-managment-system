---
phase: 01-security-hardening
plan: 3
type: execute
wave: 2
depends_on: [01-PLAN-1]
files_modified:
  - backend/src/core/limiter.py
  - backend/src/main.py
  - backend/src/routers/auth.py
  - backend/src/routers/currency.py
  - frontend/lib/api/currency.actions.ts
autonomous: true
requirements: [SEC-01, SEC-04]

must_haves:
  truths:
    - "POST /auth/login returns 429 after 10 requests in one minute from the same IP"
    - "POST /auth/register returns 429 after 5 requests in one minute from the same IP"
    - "POST /auth/request-password-reset returns 429 after 5 requests in one minute from the same IP"
    - "POST /auth/verify-password-reset returns 429 after 5 requests in one minute from the same IP"
    - "GET /api/v1/currency/rate?from=USD&to=JPY returns a conversion_rate without exposing any API key to the browser"
    - "The hardcoded API key literal 'a3769b4faf76f0a94a430f17' does not appear anywhere in the frontend JavaScript bundle"
    - "EXCHANGE_RATE_API_KEY is read from backend env vars only"
  artifacts:
    - path: "backend/src/core/limiter.py"
      provides: "Shared slowapi Limiter instance"
      exports: ["limiter"]
    - path: "backend/src/main.py"
      provides: "App setup with slowapi middleware + exception handler registered"
      contains: "RateLimitExceeded"
    - path: "backend/src/routers/auth.py"
      provides: "Rate-limited auth endpoints with @limiter.limit decorators and request: Request param"
      contains: "@limiter.limit"
    - path: "backend/src/routers/currency.py"
      provides: "New backend currency proxy endpoint GET /currency/rate"
      exports: ["router"]
    - path: "frontend/lib/api/currency.actions.ts"
      provides: "Currency functions that call backend proxy — no direct external API calls"
  key_links:
    - from: "backend/src/routers/auth.py"
      to: "backend/src/core/limiter.py"
      via: "from src.core.limiter import limiter"
      pattern: "from src\\.core\\.limiter import limiter"
    - from: "backend/src/main.py"
      to: "slowapi"
      via: "app.state.limiter + add_exception_handler"
      pattern: "RateLimitExceeded"
    - from: "frontend/lib/api/currency.actions.ts"
      to: "/api/v1/currency/rate"
      via: "apiFetch()"
      pattern: "apiFetch.*currency/rate"
---

<objective>
Add IP-based rate limiting to four auth endpoints (SEC-04) and move the currency API key off the frontend by creating a backend proxy endpoint (SEC-01).

Purpose: Prevents brute-force attacks on login/register/password-reset. Eliminates the hardcoded ExchangeRate API key from the frontend JavaScript bundle. These two concerns are grouped in one plan because both require editing auth.py (rate limiting adds decorators) and both are Wave 2 — parallel to Plan 2 but depend on Plan 1 (config.py settings added there).
Output: slowapi integrated, four auth endpoints rate-limited, new GET /currency/rate backend endpoint, frontend currency.actions.ts rewritten.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-security-hardening/01-CONTEXT.md
@.planning/phases/01-security-hardening/01-RESEARCH.md
@.planning/phases/01-security-hardening/01-01-SUMMARY.md

<interfaces>
<!-- From backend/src/core/config.py (after Plan 1) -->
```python
class Settings(BaseSettings):
    EXCHANGE_RATE_API_KEY: str   # Required — set in .env
    COOKIE_SECURE: bool = True
```

<!-- slowapi pattern (verified from research) -->
```python
# limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

# main.py registration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# endpoint usage — request: Request MUST be explicit parameter
@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, data: SignIn, response: Response, db=Depends(get_db)):
    ...
```

<!-- NOTE: Plan 3 modifies auth.py independently from Plan 2.
     These plans are Wave 2 but both touch auth.py. Execute them sequentially (Plan 2 first,
     then Plan 3) or merge the auth.py changes. The executor should apply rate limiting
     decorators and request: Request param to the auth.py produced by Plan 2. -->

<!-- From frontend/lib/api/base.actions.ts (after Plan 2) -->
```typescript
// apiFetch sends withCredentials: true — all cookies forwarded
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create limiter.py, register slowapi in main.py, add currency router</name>
  <files>backend/src/core/limiter.py, backend/src/main.py, backend/src/routers/currency.py</files>
  <action>
**Create backend/src/core/limiter.py** (new file):
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```
This single shared instance is imported by auth.py and any future endpoints that need rate limiting. A separate file avoids circular imports.

**Modify backend/src/main.py** — add slowapi registration:
1. Add imports:
   ```python
   from slowapi import _rate_limit_exceeded_handler
   from slowapi.errors import RateLimitExceeded
   from src.core.limiter import limiter
   from src.routers import currency
   ```
2. After `app = FastAPI(...)`, add:
   ```python
   app.state.limiter = limiter
   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
   ```
3. Add the currency router alongside existing routers:
   ```python
   app.include_router(currency.router, prefix="/api/v1")
   ```
Do NOT change anything else in main.py — the CORSMiddleware and existing routers stay untouched.

**Create backend/src/routers/currency.py** (new file):
This endpoint is a server-side proxy — it calls the ExchangeRate API with the backend API key and returns only the rate to the frontend. The API key never leaves the backend.

```python
import httpx
from fastapi import APIRouter, HTTPException, Query
from src.core.config import settings

router = APIRouter(prefix="/currency", tags=["currency"])

EXCHANGE_RATE_BASE = "https://v6.exchangerate-api.com/v6"


@router.get("/rate")
async def get_exchange_rate(
    from_currency: str = Query(..., alias="from", min_length=3, max_length=3),
    to_currency: str = Query(..., alias="to", min_length=3, max_length=3),
):
    """Proxy currency rate lookup through backend — API key never exposed to browser."""
    api_key = settings.EXCHANGE_RATE_API_KEY
    url = f"{EXCHANGE_RATE_BASE}/{api_key}/pair/{from_currency.upper()}/{to_currency.upper()}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Currency service unavailable")
        data = resp.json()
        if data.get("result") != "success":
            raise HTTPException(status_code=502, detail="Currency rate fetch failed")
        return {"from": from_currency.upper(), "to": to_currency.upper(), "rate": data["conversion_rate"]}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Currency service unreachable") from e
```

Note: httpx is already available in the Python environment (it's a dependency of httpx==0.27.2 in requirements.txt). No new package needed.

The response shape is `{"from": "USD", "to": "JPY", "rate": 149.5}` — simple and avoids leaking ExchangeRate API response metadata.
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system/backend && python -c "from src.core.limiter import limiter; from src.routers.currency import router; from src.main import app; print('limiter:', limiter); routes = [r.path for r in app.routes]; print('currency route:', any('/currency/rate' in str(r) for r in app.routes))"</automated>
  </verify>
  <done>
- backend/src/core/limiter.py exists with Limiter instance
- main.py has app.state.limiter and RateLimitExceeded handler
- currency router included in app at /api/v1/currency/rate
- GET /currency/rate proxies to ExchangeRate API without exposing API key
  </done>
</task>

<task type="auto">
  <name>Task 2: Add rate limit decorators to auth endpoints; rewrite frontend currency.actions.ts</name>
  <files>backend/src/routers/auth.py, frontend/lib/api/currency.actions.ts</files>
  <action>
**backend/src/routers/auth.py** — add rate limiting to four endpoints:

DEPENDENCY NOTE: If Plan 2 has already been executed, auth.py already has `Response` and `Request` imports and the cookie-based auth. Apply rate limiting ON TOP of that. If Plan 2 has not been executed yet, add `Request` to imports now (it will be used by both cookie auth and rate limiting).

1. Add imports at top:
   ```python
   from fastapi import Request
   from src.core.limiter import limiter
   ```

2. For each of the four endpoints, add BOTH:
   a. `request: Request` as the FIRST parameter in the function signature
   b. `@limiter.limit(...)` decorator BELOW the `@router.post(...)` decorator

   The order matters: `@router.post` on top, `@limiter.limit` below it, then `async def`.

   Endpoint-specific limits (per D-12):
   - `POST /auth/login`: `@limiter.limit("10/minute")`
   - `POST /auth/register`: `@limiter.limit("5/minute")`
   - `POST /auth/request-password-reset`: `@limiter.limit("5/minute")`
   - `POST /auth/verify-password-reset`: `@limiter.limit("5/minute")`

   Example for login (adjust for the actual current state of auth.py — may already have Response from Plan 2):
   ```python
   @router.post("/login", response_model=AuthResponse)
   @limiter.limit("10/minute")
   async def login(request: Request, data: SignIn, response: Response, db: AsyncSession = Depends(get_db)):
   ```

   For request-password-reset and verify-password-reset (which don't need Response):
   ```python
   @router.post("/request-password-reset", response_model=Message)
   @limiter.limit("5/minute")
   async def request_password_reset(request: Request, payload: PasswordResetRequest, db=Depends(get_db)):
   ```

3. Do NOT add rate limiting to: /auth/me, /auth/logout, /auth/change-password, /auth/confirm-password-reset, /auth/delete-account. Only the four endpoints listed above.

4. Do NOT change the function bodies — only add the decorator and the `request: Request` parameter.

**frontend/lib/api/currency.actions.ts** — complete rewrite (per D-09, D-10):

The current file calls ExchangeRate API directly with a hardcoded key. Rewrite it to call the backend proxy endpoint `/api/v1/currency/rate` via `apiFetch()`.

New currency.actions.ts:
```typescript
import { apiFetch } from "./base.actions"

interface BackendRateResponse {
    from: string
    to: string
    rate: number
}

/**
 * Get exchange rate between two currencies via backend proxy.
 * The API key is held server-side — never exposed to the browser.
 */
export async function getExchangeRate(
    fromCurrency: string,
    toCurrency: string
): Promise<number> {
    const data = await apiFetch<BackendRateResponse>(
        `/currency/rate?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`
    )
    return data.rate
}

/**
 * Exchange an amount from one currency to another.
 * Fetches the rate from the backend proxy and applies it locally.
 */
export async function exchangeAmount(
    fromCurrency: string,
    toCurrency: string,
    amount: number
): Promise<number> {
    const rate = await getExchangeRate(fromCurrency, toCurrency)
    return amount * rate
}
```

Key points:
- Both public functions (getExchangeRate, exchangeAmount) keep the same signatures — callers in CurrencyContext.tsx and lib/utils.ts work without changes
- No direct axios call to exchangerate-api.com
- No API key — not even an env var reference
- Remove the ExchangeRateResponse interface (no longer needed)
- apiFetch already has withCredentials: true (from Plan 2) so auth cookie is forwarded for authenticated endpoints
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system && grep -n "a3769b4faf76f0a94a430f17\|exchangerate-api.com\|EXCHANGE_RATE_API_KEY" frontend/lib/api/currency.actions.ts && echo "ERROR: hardcoded key still present" || echo "OK: no hardcoded key in currency.actions.ts" && grep -n "@limiter.limit\|request: Request" backend/src/routers/auth.py</automated>
  </verify>
  <done>
- auth.py: @limiter.limit decorators on all four endpoints, request: Request as first param on each
- currency.actions.ts: calls /currency/rate via apiFetch(), no direct external API calls, no API key reference
- The hardcoded literal "a3769b4faf76f0a94a430f17" is absent from currency.actions.ts
  </done>
</task>

</tasks>

<verification>
```bash
# 1. Confirm no hardcoded API key anywhere in frontend bundle path
cd e:/Study/ReactApps/my-managment-system
grep -rn "a3769b4faf76f0a94a430f17" frontend/

# 2. Confirm slowapi is wired
cd backend
python -c "from src.main import app; handlers = [str(h) for h in app.exception_handlers.keys()]; print('Handlers:', handlers)"

# 3. Confirm rate limit decorators present on correct endpoints
grep -A2 "@router.post.*login\|@router.post.*register\|@router.post.*request-password\|@router.post.*verify-password" src/routers/auth.py

# 4. Confirm currency router responds (requires running server — document as manual check)
# curl "http://localhost:5050/api/v1/currency/rate?from=USD&to=JPY"
# Expected: {"from":"USD","to":"JPY","rate":<number>}
```
</verification>

<success_criteria>
- slowapi installed (requirements.txt has slowapi==0.1.9 from Plan 1)
- limiter.py created with shared Limiter instance
- main.py has app.state.limiter and RateLimitExceeded handler
- Four auth endpoints have @limiter.limit decorators with correct rate strings (10/min login, 5/min others)
- All four rate-limited endpoints have `request: Request` as first parameter
- GET /api/v1/currency/rate proxies to ExchangeRate API server-side
- frontend currency.actions.ts calls apiFetch("/currency/rate") — zero direct external API calls
- Hardcoded API key literal absent from entire frontend/ directory
</success_criteria>

<output>
After completion, create `.planning/phases/01-security-hardening/01-03-SUMMARY.md` with:
- Files modified: backend/src/core/limiter.py (new), backend/src/main.py, backend/src/routers/auth.py, backend/src/routers/currency.py (new), frontend/lib/api/currency.actions.ts
- What changed: slowapi rate limiting on 4 auth endpoints; currency API proxied through backend
- Decisions made: httpx used for backend HTTP call (already in requirements); rate: limit state in-memory (default slowapi); response shape {"from","to","rate"} to avoid leaking API metadata
- Verification result: paste output of verification commands
</output>
