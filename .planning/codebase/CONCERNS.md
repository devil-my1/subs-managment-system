# Codebase Concerns

**Analysis Date:** 2026-04-01

---

## Security Considerations

### Hardcoded API Key in Source Code

- Risk: The ExchangeRate API key is hardcoded as a fallback value directly in source.
- Files: `frontend/lib/api/currency.actions.ts:4`
- Current state: `process.env.EXCHANGE_RATE_API_KEY || "a3769b4faf76f0a94a430f17"` — the literal key `a3769b4faf76f0a94a430f17` ships with the code and is callable from any browser.
- Current mitigation: None. This key is publicly visible to anyone who reads the bundle.
- Recommendations: Remove the fallback literal. Proxy currency conversion through the backend so the key never reaches the client. If a client-side fallback is truly needed, throw an explicit error when the env var is missing rather than using a real key.

### JWT Token Stored in Plain Cookie (No HttpOnly, No Secure)

- Risk: The authentication token is set as a client-readable cookie without `HttpOnly` or `Secure` flags, making it accessible to JavaScript and transmittable over plain HTTP.
- Files: `frontend/lib/api/auth.actions.ts:72`
- Current state: `document.cookie = \`token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax\``
- Current mitigation: `SameSite=Lax` reduces CSRF surface. However, the missing `HttpOnly` flag means any injected script can steal the token. Missing `Secure` flag means the token can be sent over HTTP.
- Recommendations: Add `; Secure; HttpOnly` to the cookie. Tokens should be set by the server via `Set-Cookie` response headers, not by client-side JavaScript.

### Password Hash Stored in Redis Cache

- Risk: The full user record including `password_hash` is serialised and stored in Redis. Any Redis compromise directly exposes password hashes for all active users.
- Files: `backend/src/api/deps.py:42-48`
- Current state: `cache_set_json(cache_key, {"id": ..., "email": ..., "password_hash": user.password_hash, ...})` — bcrypt hash lives in cache for up to 600 seconds.
- Current mitigation: bcrypt is slow to crack, so leaking the hash is not an immediate full compromise. Redis is not publicly accessible (internal Docker network).
- Recommendations: Remove `password_hash` from the cached user object. `get_current_user` only needs `id`, `email`, and `name`. Reconstruct a lightweight User object without the hash field when reading from cache.

### No Rate Limiting on Auth or Public Endpoints

- Risk: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/request-password-reset`, and `/api/v1/auth/verify-password-reset` have no rate limiting at the application layer.
- Files: `backend/src/routers/auth.py`, `backend/src/main.py`
- Current mitigation: The verify-code flow has a max 5 attempts before deleting the code (`RESET_MAX_ATTEMPTS = 5`), but login and register have no attempt throttle. Nginx configuration is not visible, so it is unknown whether upstream rate limiting exists.
- Recommendations: Add `slowapi` or a similar FastAPI rate-limit middleware. Protect `/auth/login` (e.g. 10 req/minute per IP) and `/auth/register` (e.g. 5 req/minute per IP).

### Email HTML Template Interpolates User-Controlled Data Without Escaping

- Risk: The HTML email template interpolates `sub.title`, `sub.url`, and `sub.next_renewal_date` directly using f-strings with no HTML escaping. A subscription title such as `<script>alert(1)</script>` would be sent as raw HTML in the email.
- Files: `backend/src/services/email_templates.py:7-18`
- Current mitigation: Users can only set their own subscription titles, so the XSS payload lands in their own email. However, if email is ever sent to third parties this becomes a vector.
- Recommendations: Escape HTML entities in all user-supplied fields before interpolation. Use Python's `html.escape()` on `title`, `url`, and any other dynamic string values.

### `last_error` Bug Appends Email Body on Send Failure

- Risk: In the job that sends reminder emails, when `resend.Emails.send()` raises an exception the error handler attempts to concatenate `email.body` to the error string. If the send call succeeded before the exception was raised, `email` is defined and `email.body` may contain the full sent email HTML — including user-specific renewal data — stored back into `reminder.last_error` in the database.
- Files: `backend/src/routers/jobs.py:80-81`
- Current state: `reminder.last_error = str(e)[:500] + email.body if 'email' in locals() else str(e)[:500]`
- Recommendations: The `email.body` concatenation appears unintentional. Remove it and store only the error string. This is likely a code-review oversight introduced when debugging.

---

## Tech Debt

### Settings Page Is a Stub

- Issue: The Settings page renders a placeholder `"Settings content coming soon."` with no actual functionality.
- Files: `frontend/app/(i)/settings/page.tsx`
- Impact: Users cannot change preferences (notification preferences, timezone, account settings). Sidebar link navigates to a dead-end page.
- Fix approach: Implement account settings (change password, delete account, notification preferences) or remove the menu entry until ready.

### Analytics Export Button Does Nothing

- Issue: The "Export" button in the analytics page only calls `toast("Export started", ...)` and performs no actual export logic.
- Files: `frontend/app/(i)/analytics/page.tsx:207-209`
- Impact: Users who click download receive a misleading toast message indicating work has started when nothing happens.
- Fix approach: Either implement CSV/PDF export or remove the button until the feature is ready.

### "Add Payment" Button on Subscription Detail Is Non-Functional

- Issue: A button labelled "Add payment" in the payment history section has no `onClick` handler and no form wired to it.
- Files: `frontend/app/(i)/subscriptions/[id]/page.tsx:415-423`
- Impact: Users cannot manually add payments from the detail view despite the UI implying they can.
- Fix approach: Connect a payment creation dialog (similar to the renew flow), or reuse the renew endpoint.

### "Danger Zone" Section Is Commented Out

- Issue: A full "Pause / Cancel subscription" danger zone UI block is commented out at the bottom of the subscription detail page.
- Files: `frontend/app/(i)/subscriptions/[id]/page.tsx:446-472`
- Impact: Users cannot pause or cancel subscriptions from the detail view. Status changes are only possible by editing the subscription via the AddSubDialog.
- Fix approach: Uncomment and wire up the danger zone buttons to `updateSubscription` with the appropriate status value.

### `debug` Level Logging Enabled for `app_logger` in Production

- Issue: The `app_logger` is configured at `DEBUG` level while all others use `INFO`. In a containerised production environment this will write verbose debug output to stdout.
- Files: `backend/src/utils/logs.py:22`
- Fix approach: Set `app_logger` to `INFO` level. Introduce an env-var-controlled `LOG_LEVEL` setting if debug logs are needed at development time.

### `datetime.utcnow()` Deprecated

- Issue: `datetime.utcnow()` is deprecated since Python 3.12 and raises `DeprecationWarning` in Python 3.13 (the runtime version used). The rest of the codebase correctly uses `datetime.now(timezone.utc)`.
- Files: `backend/src/routers/subscriptions.py:37`
- Fix approach: Replace `datetime.utcnow().year` with `datetime.now(timezone.utc).year`.

### `python-jose` Dependency Is Unmaintained

- Issue: `python-jose==3.5.0` is used for JWT signing. The library has known vulnerabilities (CVE-2022-29217 — algorithm confusion attack) and is no longer actively maintained. The project uses `HS256` which avoids the specific RS/EC confusion bug, but the package is a liability.
- Files: `backend/requirements.txt`, `backend/src/core/security.py`
- Fix approach: Migrate to `PyJWT` (`pip install PyJWT`) which is actively maintained and has equivalent `HS256` support.

### `passlib` Dependency Is Unmaintained

- Issue: `passlib==1.7.4` (2020) has no active maintainer. It still works but receives no security updates. The `bcrypt` backend is fine, but wrapping it through an unmaintained library introduces risk.
- Files: `backend/requirements.txt`, `backend/src/core/security.py`
- Fix approach: Replace passlib with direct `bcrypt` calls (`import bcrypt`) or use `argon2-cffi` for a more modern alternative.

### Duplicate Rate-Cache Logic Across Two Files

- Issue: An identical in-memory rate cache (`rateCache` map with `RATE_CACHE_TTL_MS` + promise deduplication) exists in both `frontend/lib/utils.ts` (12h TTL) and `frontend/context/CurrencyContext.tsx` (10m TTL). The two caches can hold different values for the same currency pair simultaneously.
- Files: `frontend/lib/utils.ts:7-38`, `frontend/context/CurrencyContext.tsx:27-50`
- Impact: Inconsistent conversion rates displayed in different parts of the UI depending on which cache was populated first.
- Fix approach: Move the single cache implementation to `lib/api/currency.actions.ts` and import it from both consumers.

### `SupportedCurrency` Is Hard-Coded to USD and JPY

- Issue: Currency conversion only works between USD and JPY. The `CurrencyContext.convertToBase` function returns the raw amount unchanged for any currency other than these two. The UI only offers a two-way USD/JPY toggle.
- Files: `frontend/context/CurrencyContext.tsx:76-84`, `frontend/types/index.d.ts:138`
- Impact: Users with subscriptions in EUR, GBP, AUD, CAD, etc. see amounts displayed in the original currency with no conversion.
- Fix approach: Generalise the conversion to accept arbitrary ISO 4217 codes using the already-available `getExchangeRate` function.

### `explore.tsx` in Mobile App Is a Boilerplate Screen

- Issue: The `(tabs)/explore.tsx` screen in the StMS React Native app is the unmodified Expo template "Explore" screen with documentation collapsibles.
- Files: `StMS/app/(tabs)/explore.tsx`
- Impact: A real tab in the navigation bar shows Expo template content to users.
- Fix approach: Replace with real content or remove the tab from `StMS/app/(tabs)/_layout.tsx`.

---

## Performance Concerns

### Analytics Page Fires Four Parallel API Calls on Every Mount

- Issue: The analytics page calls `Promise.all` with four separate API requests (`/analytics/spend`, `/analytics/spend/by-month`, `/analytics/spend/by-category`, `/subscriptions`) every time the component mounts. There is no local caching or SWR-style deduplication.
- Files: `frontend/app/(i)/analytics/page.tsx:48-65`
- Impact: Four backend round-trips per page visit. The analytics responses are Redis-cached server-side (120s TTL), but there is no client-side caching; a page revisit within the same session re-fires all four requests.
- Fix approach: Introduce React Query or SWR for client-side cache. Alternatively, combine the three analytics endpoints into one backend endpoint that returns all three datasets.

### Subscription List Fetched Twice on Dashboard

- Issue: The dashboard page fetches `/subscriptions` and `/analytics/spend/by-category` directly. The subscriptions page, when navigated to separately, also fetches `/subscriptions`. There is no shared client-side store, so each page fetches the full list independently.
- Files: `frontend/app/(i)/dashboard/page.tsx:55-58`, `frontend/app/(i)/subscriptions/page.tsx:89-94`
- Impact: Redundant network requests when users navigate between dashboard and subscriptions within a session.
- Fix approach: Use a global state manager (Zustand, React Query) to share and cache the subscriptions list.

### `cache_delete_prefix` Uses Redis SCAN in a Loop

- Issue: The `cache_delete_prefix` function scans all Redis keys matching a pattern in a while loop. On a large Redis instance with many keys this can be slow. The pattern `subs:list:{user.id}:*` is specific enough that scan should terminate quickly for small datasets, but there is no timeout or guard.
- Files: `backend/src/utils/cache.py:36-45`
- Impact: Low risk at current scale. Could cause noticeable latency on write operations if key count grows.
- Fix approach: Acceptable for current scale. Long-term consider using Redis key namespacing with hash tags to allow instant slot-level invalidation.

### Monthly Spend Computation Is Client-Side

- Issue: The dashboard computes "Monthly Spend" by summing all subscription amounts in the browser (`subs.reduce((acc, s) => acc + convertToBase(...))`), which fetches every subscription regardless of status.
- Files: `frontend/app/(i)/dashboard/page.tsx:94-99`
- Impact: Correct only if all subscriptions are active. Paused, canceled, and expired subscriptions are included in the total since no status filter is applied.
- Fix approach: Filter by `status === "active"` before reducing. The backend analytics endpoints already provide accurate spend-based totals using payment records.

---

## Missing Error Handling

### API Action Functions Double-Log Errors

- Issue: Every function in `frontend/lib/api/subs.actions.ts`, `category.actions.ts`, and `analytics.actions.ts` catches the error, calls `console.error(...)`, then re-throws it. The catch in the calling component also logs or surfaces the error. This produces duplicate log entries for every API failure.
- Files: `frontend/lib/api/subs.actions.ts`, `frontend/lib/api/category.actions.ts`, `frontend/lib/api/analytics.actions.ts`
- Fix approach: Remove the `console.error` calls from the action functions. Let errors propagate naturally; calling components are responsible for surfacing errors to the user.

### `AuthForm` Logs `user` Object to Console

- Issue: A leftover `console.log(user)` statement fires after every successful registration/login.
- Files: `frontend/components/AuthForm.tsx:88`
- Fix approach: Remove the debug log.

### Reminder Scheduling Silently Swallows Failures

- Issue: When creating or updating a subscription, the `regenerate_email_reminder` call is wrapped in a bare `except Exception: await db.rollback()`. The exception is not logged and the caller receives no indication that reminder scheduling failed.
- Files: `backend/src/routers/subscriptions.py:194-198`, `backend/src/routers/subscriptions.py:277-282`
- Fix approach: Log the exception at WARNING level so failures appear in the log stream while still allowing the subscription save to succeed.

### Redis Connection Has No Error Handling

- Issue: The Redis client is initialised lazily without a health check. If Redis is unavailable, any request that reads or writes cache will raise an unhandled `ConnectionError` at the `await client.get(key)` call site inside `cache_get_json`. Since the cache functions are called in every protected route, a Redis outage takes down the entire API.
- Files: `backend/src/utils/cache.py:11-18`, `backend/src/api/deps.py:25-26`
- Impact: Redis is a hard dependency for all authenticated requests (user cache lookup is performed before each request). If Redis is down, all users get 500 errors.
- Fix approach: Add a try/except around cache reads in `get_current_user` that falls back to a database lookup on `ConnectionError`. Cache writes can fail silently.

---

## Test Coverage Gaps

### No Unit Tests — Only Integration Tests Against Live Stack

- What's not tested: Business logic in `backend/src/services/subscriptions.py` (renewal date advancement, reminder scheduling), security functions in `backend/src/core/security.py`, cache utilities, and all schema validation edge cases.
- Files: `backend/tests/` — all three test files are integration tests that skip themselves if the API is unreachable.
- Risk: Renewal logic bugs (off-by-one in `_advance_date`, incorrect JST→UTC conversion) cannot be caught in CI without a running database.
- Priority: High for `advance_due_renewals` and `regenerate_email_reminder` since these run on a schedule and affect financial data.

### No Frontend Tests

- What's not tested: No test files exist in `frontend/` or `StMS/`. No Playwright, Cypress, Vitest, or Jest configuration is present.
- Files: `frontend/` — zero `*.test.*` or `*.spec.*` files.
- Risk: Currency conversion logic, date utilities in `lib/utils.ts`, and form validation schemas have no automated verification.
- Priority: Medium. Start with unit tests for `lib/utils.ts` functions and `lib/api/` action functions using `vitest`.

### Delete Subscription Not Tested

- What's not tested: The subscription deletion endpoint is explicitly skipped in the test comment `# Delete not implemented; just ensure list pagination works`.
- Files: `backend/tests/test_subscriptions.py:60`
- Risk: No automated verification that `DELETE /subscriptions/{id}` correctly removes the record, cascades to payments/reminders, and invalidates cache.
- Priority: Medium.

---

## Scalability Concerns

### Single-User Architecture Assumption

- Current state: The application appears designed as a personal finance tool. The `CORS_ORIGINS` default allows only localhost. There is no tenant isolation beyond `user_id` filters on every query.
- Limit: The current design works correctly for multiple users but has no admin interface, no billing, and no subscription plan enforcement.
- Scaling path: The existing per-user data isolation is solid. Multi-tenancy at scale would require adding database connection pooling configuration (PgBouncer) and Redis cluster support.

### Job Batch Size Is Hardcoded to 50 Reminders Per Run

- Current state: The `send-reminders` job fetches `.limit(50)` reminders per invocation.
- Limit: If more than 50 reminders are pending, they queue up and some users receive late notifications until the next cron run.
- Files: `backend/src/routers/jobs.py:38`
- Scaling path: Make the batch size configurable via a `REMINDER_BATCH_SIZE` env var, or process all pending reminders in a loop within one job run.

### No Database Connection Pool Configuration

- Current state: SQLAlchemy uses its default async pool size (5 connections) with no explicit `pool_size`, `max_overflow`, or `pool_timeout` settings.
- Files: `backend/src/db/session.py:5-6`
- Limit: Under concurrent load the pool may exhaust and requests will wait or time out.
- Scaling path: Add `pool_size=10, max_overflow=20, pool_pre_ping=True` to the `create_async_engine` call (pre_ping is already set).

---

## Incomplete Features / Stubs

| Feature | Location | Status |
|---|---|---|
| Settings page | `frontend/app/(i)/settings/page.tsx` | Placeholder only |
| Analytics export | `frontend/app/(i)/analytics/page.tsx:207` | Toast stub, no implementation |
| Add payment button | `frontend/app/(i)/subscriptions/[id]/page.tsx:415` | No handler |
| Pause/cancel danger zone | `frontend/app/(i)/subscriptions/[id]/page.tsx:446-472` | Commented out |
| Explore tab (mobile) | `StMS/app/(tabs)/explore.tsx` | Expo boilerplate |
| Push notification channel | `backend/src/models/reminder.py:22` (comment: `'email' or 'push'`) | Email only; push never implemented |

---

*Concerns audit: 2026-04-01*
