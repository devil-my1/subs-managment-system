# Phase 2: Code Quality Fixes - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 5 isolated code quality issues in the SubTracker backend and frontend. No new features. Goal: production runtime is clean — no debug noise, no deprecated warnings, no Redis single-point-of-failure, no debug artifacts.

Requirements in scope: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05

</domain>

<decisions>
## Implementation Decisions

### Production Logging (FIX-01)

- **D-01:** Change `app_logger` in `backend/src/utils/logs.py:22` from `level=DEBUG` to `level=INFO`.
- **D-02:** No env-var-controlled `LOG_LEVEL` needed — just set INFO directly.

### Deprecated datetime (FIX-02)

- **D-03:** Replace `datetime.utcnow().year` with `datetime.now(timezone.utc).year` in `backend/src/routers/subscriptions.py:37`.
- **D-04:** Single line change only — no other files affected.

### Redis Connection Fallback (FIX-03)

- **D-05:** Wrap `cache_get_json(cache_key)` in `backend/src/api/deps.py` in a try/except that catches `ConnectionError` (and/or `Exception` from redis client).
- **D-06:** On Redis read failure: log a warning (`app_logger.warning("Redis unavailable, falling back to DB")`) then skip the cache and proceed directly to the DB lookup.
- **D-07:** On Redis write failure (after successful DB fetch): swallow silently — no log, just continue. Cache miss on next request is acceptable.

### Debug console.log (FIX-04)

- **D-08:** Remove `console.log(user)` at `frontend/components/AuthForm.tsx:88`. Remove the line entirely.

### Double-logging in API actions (FIX-05)

- **D-09:** Remove `console.error(...)` calls from catch blocks in all three action files:
  - `frontend/lib/api/subs.actions.ts` (5 occurrences)
  - `frontend/lib/api/category.actions.ts`
  - `frontend/lib/api/analytics.actions.ts`
- **D-10:** Keep the `throw error` / `throw new Error(...)` re-throw in each catch block — callers still get the error.
- **D-11:** Do NOT touch calling components (page files) — they already handle errors correctly.

### Claude's Discretion

- Whether to catch `ConnectionError` specifically or a broader `Exception` for the Redis fallback — Claude can choose the most appropriate exception type for the redis client in use.
- Whether to consolidate FIX-01 through FIX-05 into one plan or two — Claude can decide based on grouping by file/layer (backend vs frontend).

</decisions>

<specifics>
## Specific Ideas

- All 5 fixes have known exact file locations from CONCERNS.md audit. No discovery needed.
- FIX-03 is the only fix with behavioural impact (Redis down → requests still succeed). The others are cosmetic/correctness fixes with zero runtime behaviour change.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Exact file locations for each fix
- `.planning/codebase/CONCERNS.md` §Tech Debt and §Missing Error Handling — authoritative locations for all 5 fixes

### Files to modify
- `backend/src/utils/logs.py:22` — FIX-01
- `backend/src/routers/subscriptions.py:37` — FIX-02
- `backend/src/api/deps.py` — FIX-03 (Redis fallback in get_current_user)
- `frontend/components/AuthForm.tsx:88` — FIX-04
- `frontend/lib/api/subs.actions.ts` — FIX-05
- `frontend/lib/api/category.actions.ts` — FIX-05
- `frontend/lib/api/analytics.actions.ts` — FIX-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app_logger` from `backend/src/utils/logs.py` — already used in auth router; use same logger for the Redis warning in deps.py
- `backend/src/api/deps.py` already has the correct fallback DB-lookup path (lines 35-45) — FIX-03 just needs a try/except wrapped around the cache read to reach it

### Established Patterns
- Backend: all loggers use `setup_logger()` factory from `logs.py`; warning level is `auth_logger.warning(...)` pattern already in use
- Frontend: action functions follow `try { ... } catch (error) { console.error(...); throw error }` pattern — FIX-05 removes the console.error from this pattern

### Integration Points
- `deps.py` `get_current_user` is called on every protected route — Redis fallback fix benefits entire API
- `AuthForm.tsx` imports and calls both `login` and `register` — removing console.log(user) at line 88 is safe

</code_context>

<deferred>
## Deferred Ideas

- Making LOG_LEVEL configurable via env var — nice to have but not needed for this fix
- Adding Redis health check endpoint — separate feature, not in scope
- Touching calling components (pages) for FIX-05 — explicitly out of scope per decision D-11

</deferred>

---

*Phase: 02-code-quality-fixes*
*Context gathered: 2026-04-02 via discuss-phase*
