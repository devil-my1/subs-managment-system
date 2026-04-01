---
phase: 01-security-hardening
plan: 01
subsystem: auth
tags: [jwt, bcrypt, pyjwt, security, dependencies, fastapi]

# Dependency graph
requires: []
provides:
  - "PyJWT-based JWT token creation and validation via security.py"
  - "Direct bcrypt password hashing/verification via security.py"
  - "COOKIE_SECURE settings field for Plan 2 (cookie hardening)"
  - "EXCHANGE_RATE_API_KEY settings field for Plan 3 (currency proxy)"
  - "slowapi dependency pre-added for Plan 4 (rate limiting)"
affects: [01-02-cookie-hardening, 01-03-currency-proxy, 01-04-email-security, 01-05-rate-limiting]

# Tech tracking
tech-stack:
  added: [PyJWT==2.12.1, slowapi==0.1.9]
  patterns: ["Direct library usage over abstraction layers (bcrypt/PyJWT instead of passlib/jose wrappers)"]

key-files:
  created: [backend/tests/test_security.py]
  modified: [backend/requirements.txt, backend/src/core/security.py, backend/src/core/config.py]

key-decisions:
  - "PyJWT replaces python-jose: python-jose has CVE-2022-29217 and is unmaintained"
  - "Direct bcrypt replaces passlib: passlib unmaintained since 2020; direct bcrypt reads same $2b$ prefix so existing DB hashes remain valid"
  - "bcrypt work factor 12: balance of security and performance"
  - "cffi retained in requirements.txt: cryptography package depends on it"
  - "slowapi added proactively for Plan 3 rate limiting: minimizes future file churn"
  - "EXCHANGE_RATE_API_KEY required (not Optional) with placeholder in .env for dev"

patterns-established:
  - "TDD pattern: test file committed first (RED), then implementation (GREEN)"
  - "decode_token raises ValueError('Invalid token') — callers (deps.py) do not need changes"

requirements-completed: [SEC-07, SEC-08]

# Metrics
duration: 6min
completed: 2026-04-01
---

# Phase 01 Plan 01: Dependency Migration (python-jose to PyJWT, passlib to bcrypt) Summary

**python-jose and passlib replaced with PyJWT + direct bcrypt; COOKIE_SECURE and EXCHANGE_RATE_API_KEY added to Settings; all 9 security unit tests pass**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-01T15:00:14Z
- **Completed:** 2026-04-01T15:06:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Removed python-jose==3.5.0 (CVE-2022-29217), passlib==1.7.4, and their transitive deps (ecdsa, pyasn1, rsa) from requirements.txt
- Rewrote security.py: hash_password/verify_password use direct bcrypt; create_access_token/decode_token use PyJWT — public API unchanged so no callers needed modification
- Added COOKIE_SECURE and EXCHANGE_RATE_API_KEY to Settings; COOKIE_SECURE defaults True for production safety
- Added slowapi==0.1.9 and PyJWT==2.12.1 to requirements.txt

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace python-jose/passlib in requirements.txt; add COOKIE_SECURE and EXCHANGE_RATE_API_KEY to config.py** - `ca8c6cb` (chore)
2. **Task 2 RED: Add failing tests for PyJWT + bcrypt security rewrite** - `bbb1671` (test) *(committed by parallel agent in same worktree)*
3. **Task 2 GREEN: Rewrite security.py — replace python-jose with PyJWT and passlib with direct bcrypt** - `666597b` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD task has test commit (RED) then implementation commit (GREEN)_

## Files Created/Modified

- `backend/requirements.txt` — Removed python-jose, passlib, ecdsa, pyasn1, rsa; added PyJWT==2.12.1 and slowapi==0.1.9
- `backend/src/core/security.py` — Rewritten: imports jwt + bcrypt directly; full bcrypt/PyJWT implementation
- `backend/src/core/config.py` — Added COOKIE_SECURE: bool = True and EXCHANGE_RATE_API_KEY: str
- `backend/tests/test_security.py` — 9 unit tests covering all security functions and passlib hash compatibility

## Decisions Made

- **PyJWT work-factor 12:** Balance of security (resistant to brute force) and performance (acceptable latency per login)
- **cffi retained:** cryptography package depends on cffi; removing it would break crypto operations
- **slowapi pre-added:** Plan 4 (rate limiting) needs it — adding while editing requirements.txt avoids a separate file touch
- **EXCHANGE_RATE_API_KEY required, not Optional:** Forces explicit env configuration; placeholder added to .env for dev

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added EXCHANGE_RATE_API_KEY placeholder to .env**
- **Found during:** Task 2 RED phase (test collection)
- **Issue:** EXCHANGE_RATE_API_KEY was added as a required field in Task 1, but the existing .env lacked it, causing Pydantic ValidationError on module import which blocked test collection
- **Fix:** Added `EXCHANGE_RATE_API_KEY=placeholder_replace_with_real_key` to .env
- **Files modified:** backend/.env (gitignored — not committed)
- **Verification:** Tests collected and ran successfully after adding the value
- **Committed in:** Not committed (.env is gitignored); users must add this to their own .env

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking)
**Impact on plan:** Essential for test execution. No scope creep. The .env change is expected setup work for a new required field.

## Issues Encountered

- Test file `backend/tests/test_security.py` was already committed by a parallel agent (Plan 01-04) running in the same worktree before this agent's RED commit. The test content was identical to what this agent wrote — no conflict. Skipped duplicate RED commit.

## Verification Results

```
$ grep -rn "from jose|from passlib|import jose|import passlib" src/
(no output — no stale imports)

$ python -c "import src.core.security; print('security module OK')"
security module OK

$ python -c "import src.core.config; from src.core.config import settings; print('COOKIE_SECURE:', settings.COOKIE_SECURE)"
COOKIE_SECURE: True

$ python -c "from src.core.security import hash_password, verify_password, create_access_token, decode_token; h = hash_password('test1234'); assert h.startswith('$2b$12$'); assert verify_password('test1234', h); assert not verify_password('wrong', h); tok = create_access_token('u-999'); pl = decode_token(tok); assert pl['sub'] == 'u-999'; print('ALL SECURITY CHECKS PASSED')"
ALL SECURITY CHECKS PASSED

$ python -m pytest tests/test_security.py -v
9 passed in 1.47s
```

## User Setup Required

**EXCHANGE_RATE_API_KEY must be added to backend/.env.** This is a required settings field added in this plan. Without it, the backend will fail to start.

Add to `backend/.env`:
```
EXCHANGE_RATE_API_KEY=your_actual_api_key_here
```

The real key will be configured in Plan 3 (currency proxy). For now a placeholder is sufficient for local development.

## Next Phase Readiness

- Plan 2 (cookie hardening): COOKIE_SECURE field is ready in Settings
- Plan 3 (currency proxy): EXCHANGE_RATE_API_KEY field is ready in Settings; slowapi pre-added to requirements.txt
- All callers of security.py (auth.py, deps.py) are unaffected — public API unchanged

---
*Phase: 01-security-hardening*
*Completed: 2026-04-01*

## Self-Check: PASSED

- FOUND: backend/requirements.txt (PyJWT present, python-jose absent, passlib absent)
- FOUND: backend/src/core/security.py (import jwt + import bcrypt)
- FOUND: backend/src/core/config.py (COOKIE_SECURE + EXCHANGE_RATE_API_KEY)
- FOUND: .planning/phases/01-security-hardening/01-01-SUMMARY.md
- FOUND commit ca8c6cb: chore(01-01) requirements + config changes
- FOUND commit 666597b: feat(01-01) security.py rewrite
