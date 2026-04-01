---
phase: 01-security-hardening
plan: 2
type: execute
wave: 2
depends_on: [01-PLAN-1]
files_modified:
  - backend/src/api/deps.py
  - backend/src/routers/auth.py
  - backend/src/schemas/auth.py
  - frontend/lib/api/auth.actions.ts
  - frontend/lib/api/base.actions.ts
autonomous: true
requirements: [SEC-02]

must_haves:
  truths:
    - "POST /auth/login sets a Set-Cookie response header with token=<jwt>; HttpOnly; Secure; SameSite=Lax"
    - "POST /auth/register sets the same Set-Cookie response header"
    - "POST /auth/logout clears the cookie by setting token=; max-age=0 via Set-Cookie"
    - "After login, JavaScript cannot read the cookie via document.cookie (HttpOnly enforced)"
    - "frontend apiFetch() no longer reads document.cookie or sets Authorization header for the token"
    - "frontend auth.actions.ts has no setToken() or clearToken() functions"
    - "The proxy.ts middleware continues to work unchanged — it reads req.cookies.get('token') which sees HttpOnly cookies server-side"
    - "All protected API endpoints continue to authenticate correctly via the cookie"
  artifacts:
    - path: "backend/src/api/deps.py"
      provides: "get_current_user dependency — reads token from request cookie, not Authorization header"
      contains: "request.cookies.get"
    - path: "backend/src/routers/auth.py"
      provides: "login/register return cookie, not token in body; POST /auth/logout endpoint added"
      contains: "response.set_cookie"
    - path: "backend/src/schemas/auth.py"
      provides: "AuthResponse without access_token — only user_name and user_id"
    - path: "frontend/lib/api/auth.actions.ts"
      provides: "login/register/logout functions — no token manipulation"
    - path: "frontend/lib/api/base.actions.ts"
      provides: "apiFetch() — no Authorization header, credentials: include for cookie forwarding"
  key_links:
    - from: "browser"
      to: "backend /api/v1/auth/login"
      via: "POST with credentials"
      pattern: "credentials.*include"
    - from: "backend/src/routers/auth.py"
      to: "response.set_cookie"
      via: "FastAPI Response injection"
      pattern: "response\\.set_cookie"
    - from: "backend/src/api/deps.py"
      to: "request.cookies"
      via: "FastAPI Request injection"
      pattern: "request\\.cookies\\.get"
---

<objective>
Migrate the JWT auth flow from client-managed plain cookies to server-set HttpOnly cookies. This requires changes to three backend files (deps.py, auth.py, schemas/auth.py) and two frontend files (auth.actions.ts, base.actions.ts).

Purpose: Eliminates the vulnerability where JavaScript can read the auth token from document.cookie. After this plan, tokens are invisible to JavaScript and only the browser (and Next.js server-side middleware) can access them.
Output: Cookie-based auth end-to-end — login/register/logout set/clear the cookie server-side; apiFetch sends credentials automatically; all protected routes authenticate via cookie.
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
<!-- From backend/src/core/security.py (after Plan 1) -->
```python
def create_access_token(subject: str) -> str: ...
def decode_token(token: str) -> dict: ...  # raises ValueError on invalid
```

<!-- From backend/src/core/config.py (after Plan 1) -->
```python
class Settings(BaseSettings):
    ACCESS_TOKEN_MINUTES: int = 60 * 24 * 7
    COOKIE_SECURE: bool = True  # Set False in .env for local HTTP dev
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    CACHE_USER_TTL: int = 600
```

<!-- From backend/src/schemas/auth.py (current — will be changed by Task 1) -->
```python
class AuthResponse(BaseModel):
    access_token: str   # REMOVE THIS
    user_name: str
    token_type: str = "bearer"  # REMOVE THIS
```

<!-- From frontend/lib/api/base.actions.ts (current) -->
```typescript
// apiFetch currently reads document.cookie for token and sets Authorization header
// After this plan: remove token extraction, add credentials: "include"
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T>
```

<!-- From frontend/proxy.ts — NO CHANGES NEEDED -->
// proxy.ts uses req.cookies.get("token")?.value — works with HttpOnly cookies server-side
// DO NOT MODIFY proxy.ts
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update AuthResponse schema and rewrite deps.py to read token from cookie</name>
  <files>backend/src/schemas/auth.py, backend/src/api/deps.py</files>
  <action>
**backend/src/schemas/auth.py** — Modify AuthResponse:
- Remove the `access_token: str` field
- Remove the `token_type: str = "bearer"` field
- Keep `user_name: str`
- Add `user_id: str`
- Final schema:
  ```python
  class AuthResponse(BaseModel):
      user_name: str
      user_id: str
  ```
- Leave all other schemas (SignUp, SignIn, UserMe, PasswordResetRequest, etc.) completely unchanged.

**backend/src/api/deps.py** — Complete rewrite of token extraction logic:
- Remove: `from fastapi.security import OAuth2PasswordBearer` and `oauth2_scheme = OAuth2PasswordBearer(...)`
- Add: `from fastapi import Request` to imports
- Change `get_current_user` signature: replace `token: str = Depends(oauth2_scheme)` with `request: Request`
- Extract token: `token = request.cookies.get("token")`
- If token is None or empty: raise HTTPException(status_code=401, detail="Not authenticated")
- The rest of the function (decode_token, cache lookup, DB fallback) stays IDENTICAL — do not change cache logic.

CRITICAL — password_hash cache fix (per D-14, SEC-03): While in deps.py, ALSO apply the Redis cache fix:
- In the `if cached:` branch: remove `password_hash=cached["password_hash"]` from the User() constructor call. The User object returned from cache will NOT have password_hash set.
- In the `cache_set_json` call: remove the `"password_hash": user.password_hash` line from the dict.
- The cached dict now stores only: id, email, name, created_at.
- IMPORTANT: The `change_password` endpoint in auth.py reads `user.password_hash` via `Depends(get_current_user)`. After this change, a cached user will have password_hash=None. To fix this, add a NOTE in the task summary — Plan 2 Task 2 will handle the change_password fix in auth.py by adding a fresh DB fetch before verify_password when the user came from cache.

Updated get_current_user function shape:
```python
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
        name = cached.get("name") or "User"
        return User(
            id=UUID(cached["id"]),
            email=cached["email"],
            name=name,
            created_at=datetime.fromisoformat(created) if created else None,
        )

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    await cache_set_json(cache_key, {
        "id": str(user.id),
        "email": user.email,
        "name": user.name or "User",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }, ttl=settings.CACHE_USER_TTL)
    return user
```
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system/backend && python -c "from src.api.deps import get_current_user; from src.schemas.auth import AuthResponse; r = AuthResponse(user_name='Test', user_id='abc'); assert not hasattr(r, 'access_token'); print('Schema OK:', r.model_dump()); print('Deps import OK')"</automated>
  </verify>
  <done>
- AuthResponse has user_name and user_id, no access_token
- deps.py imports Request, reads request.cookies.get("token"), no OAuth2PasswordBearer
- Cache stores no password_hash field
- Cache read constructs User without password_hash
  </done>
</task>

<task type="auto">
  <name>Task 2: Rewrite auth.py — cookie responses on login/register, logout endpoint, change_password DB fetch fix</name>
  <files>backend/src/routers/auth.py</files>
  <action>
Modify backend/src/routers/auth.py:

**Imports to add:**
- `from fastapi import Response` (for set_cookie)
- `from fastapi import Request` (for rate limiting in Plan 3 — add now to avoid re-editing)

**POST /auth/login** changes:
1. Add `response: Response` as a parameter (alongside existing `data: SignIn, db: ...`)
2. After verifying credentials, call:
   ```python
   token = create_access_token(str(user.id))
   response.set_cookie(
       key="token",
       value=token,
       httponly=True,
       secure=settings.COOKIE_SECURE,
       samesite="lax",
       max_age=settings.ACCESS_TOKEN_MINUTES * 60,
       path="/"
   )
   ```
3. Return: `AuthResponse(user_name=user.name, user_id=str(user.id))` — no access_token
4. Import `settings` from `src.core.config` if not already imported (check existing imports)

**POST /auth/register** changes — mirror the login changes:
1. Add `response: Response` as parameter
2. After creating user and refreshing, set cookie same way as login
3. Return: `AuthResponse(user_name=user.name, user_id=str(user.id))`

**Add POST /auth/logout** endpoint (NEW):
```python
@router.post("/logout", response_model=Message)
async def logout(response: Response):
    response.set_cookie(
        key="token",
        value="",
        max_age=0,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/"
    )
    return {"detail": "Logged out successfully"}
```
Also invalidate the user cache on logout (per Claude's discretion — recommended): The logout endpoint does not have access to user_id without reading the cookie. To keep logout simple and stateless, just clear the cookie — do not attempt cache invalidation from logout (the cache TTL is 600s, acceptable).

**POST /auth/change-password** fix (critical — per Plan 1 notes):
The user object from get_current_user may come from the Redis cache which no longer contains password_hash (after Task 1 change). `verify_password(payload.old_password, user.password_hash)` will fail with an error if password_hash is None.

Fix: At the start of the change_password function, always fetch a fresh user from DB to get password_hash:
```python
# After getting user from Depends(get_current_user), fetch fresh from DB for password_hash
res = await db.execute(select(User).where(User.id == user.id))
db_user = res.scalar_one_or_none()
if not db_user:
    raise HTTPException(status_code=401, detail="User not found")
```
Then use `db_user.password_hash` for `verify_password` and `db_user.password_hash = hash_password(...)` for the update. Use `db_user` for all DB operations in change_password. Keep the existing `user` parameter from Depends for auth only.

Add `settings` import: `from src.core.config import settings` — check if already present and add if not.
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system/backend && python -c "from src.routers.auth import router; routes = [r.path for r in router.routes]; print('Routes:', routes); assert any('/logout' in r for r in routes), 'logout route missing'; print('Logout route present')" && grep -n "set_cookie\|COOKIE_SECURE\|logout\|db_user" src/routers/auth.py</automated>
  </verify>
  <done>
- login and register endpoints call response.set_cookie with httponly=True, secure=settings.COOKIE_SECURE
- POST /auth/logout endpoint exists, clears cookie with max_age=0
- change_password fetches a fresh DB user before calling verify_password
- AuthResponse returned without access_token
  </done>
</task>

<task type="auto">
  <name>Task 3: Update frontend auth.actions.ts and base.actions.ts for HttpOnly cookie flow</name>
  <files>frontend/lib/api/auth.actions.ts, frontend/lib/api/base.actions.ts</files>
  <action>
**frontend/lib/api/auth.actions.ts** — complete rewrite:

Goal: Remove all client-side cookie manipulation. Frontend no longer touches the token. The cookie is set by the browser automatically on login/register response, and cleared by the browser on logout response.

Changes:
1. Remove `setToken()` function entirely (per D-05)
2. Remove `clearToken()` function entirely (per D-05)
3. Rewrite `login()`:
   - Call `apiFetch<{ user_name: string; user_id: string }>("/auth/login", ...)` — new response shape
   - Do NOT call setToken()
   - Return `data.user_name` (same interface for callers)
4. Rewrite `register()`:
   - Call `apiFetch<{ user_name: string; user_id: string }>("/auth/register", ...)` — new response shape
   - Do NOT call setToken()
   - Return `data.user_name` (same interface for callers)
5. Rewrite `logout()`:
   - Call `apiFetch<{ detail: string }>("/auth/logout", { method: "POST" })`
   - This hits the new backend endpoint which clears the HttpOnly cookie server-side
   - Remove clearToken() call — it no longer exists
   - Keep error handling

The public function signatures (login, register, requestPasswordReset, verifyPasswordReset, confirmPasswordReset, logout) must be unchanged — callers in the rest of the codebase will work without modification.

**frontend/lib/api/base.actions.ts** — targeted changes:

The function currently reads document.cookie to extract the token and sets `Authorization: Bearer <token>`. With HttpOnly cookies, document.cookie cannot read the token. Fix:

1. Remove (or comment out) the `getToken()` function — it can no longer read HttpOnly cookies and should not be used.
   - If `getToken()` is exported and used elsewhere, keep the function but make it always return undefined. Check for usages with: grep -r "getToken" frontend/
   - If only used internally in apiFetch, delete it.
2. In `apiFetch()`:
   - Remove: `const token = typeof window !== "undefined" ? getToken() : undefined`
   - Remove: `if (token) headersInit.set("Authorization", \`Bearer \${token}\`)`
   - Add: `credentials: "include"` to the axiosConfig object. This tells axios to send cookies (including HttpOnly cookies) with cross-origin requests. Since the backend and frontend may be on the same origin via Nginx proxy, this ensures cookies are always forwarded.
   - The axiosConfig object should include: `withCredentials: true` (axios equivalent of fetch's `credentials: "include"`)

Final apiFetch axios config shape:
```typescript
const axiosConfig: AxiosRequestConfig = {
    ...rest,
    headers,
    data: body,
    signal: signal ?? undefined,
    withCredentials: true,
}
```

3. Leave Content-Type and Cache-Control headers as-is.

IMPORTANT: proxy.ts must NOT be modified. It already reads `req.cookies.get("token")` which works correctly with HttpOnly cookies on the server side. Verify this is still the case after changes.
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system/frontend && grep -n "setToken\|clearToken\|document\.cookie\|Authorization.*Bearer\|withCredentials" lib/api/auth.actions.ts lib/api/base.actions.ts</automated>
  </verify>
  <done>
- auth.actions.ts: no setToken, no clearToken, no document.cookie references
- base.actions.ts: no Authorization Bearer header set from cookie; withCredentials: true present
- logout() calls POST /auth/logout via apiFetch
- proxy.ts is unchanged
  </done>
</task>

</tasks>

<verification>
Run end-to-end verification:

```bash
# 1. Confirm no old patterns remain in backend
cd e:/Study/ReactApps/my-managment-system/backend
grep -rn "OAuth2PasswordBearer\|password_hash.*cache\|access_token.*AuthResponse" src/

# 2. Confirm backend imports cleanly
python -c "from src.routers.auth import router; from src.api.deps import get_current_user; print('Backend auth imports OK')"

# 3. Confirm frontend no longer references setToken/clearToken/document.cookie in auth context
cd e:/Study/ReactApps/my-managment-system/frontend
grep -rn "setToken\|clearToken\|document\.cookie" lib/api/

# 4. Confirm proxy.ts is unchanged
grep -n "req.cookies.get" proxy.ts
```

Expected:
- grep 1: no results (OAuth2PasswordBearer gone, password_hash not in cache dict, access_token not in AuthResponse)
- grep 2: imports succeed
- grep 3: no results
- grep 4: shows `req.cookies.get("token")` on expected line (unchanged)
</verification>

<success_criteria>
- Backend sets HttpOnly + Secure + SameSite=Lax cookie on login and register (per D-01, D-02)
- POST /auth/logout endpoint exists and clears the cookie (per D-04)
- Frontend setToken() and clearToken() are deleted (per D-05)
- apiFetch() sends withCredentials: true — no Authorization header from client cookie (per D-06)
- Redis cache no longer stores password_hash (SEC-03, D-14 — addressed in Task 1 as part of deps.py rewrite)
- change_password fetches fresh DB user before verify_password (critical bug fix — prevents 500 error after cache migration)
- proxy.ts is untouched and still works (confirmed by grep)
</success_criteria>

<output>
After completion, create `.planning/phases/01-security-hardening/01-02-SUMMARY.md` with:
- Files modified: backend/src/api/deps.py, backend/src/routers/auth.py, backend/src/schemas/auth.py, frontend/lib/api/auth.actions.ts, frontend/lib/api/base.actions.ts
- What changed: HttpOnly cookie auth flow end-to-end; logout endpoint added; cache cleaned of password_hash; change_password fixed; frontend cookie management removed
- Decisions made: logout does not invalidate cache (stateless, cookie cleared client-side by Set-Cookie); withCredentials: true on all apiFetch calls
- Verification result: paste output of verification commands
</output>
