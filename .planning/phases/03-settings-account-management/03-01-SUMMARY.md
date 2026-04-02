---
phase: 03-settings-account-management
plan: 01
subsystem: auth-api
tags: [backend, frontend, api, endpoints, tests]
dependency_graph:
  requires: []
  provides: [update-name-endpoint, update-email-endpoint, frontend-account-actions]
  affects: [backend/src/routers/auth.py, backend/src/schemas/auth.py, frontend/lib/api/auth.actions.ts]
tech_stack:
  added: []
  patterns: [pydantic-schema-validation, try-except-httpexception, typed-apifetch]
key_files:
  created: []
  modified:
    - backend/src/schemas/auth.py
    - backend/src/routers/auth.py
    - backend/tests/test_auth.py
    - frontend/lib/api/auth.actions.ts
decisions:
  - update-email fetches fresh user from DB for password verification (not cache) per SEC-03
  - tests use Bearer token auth headers (not cookies) matching OAuth2PasswordBearer dependency
metrics:
  duration: 239s
  completed: "2026-04-02T08:33:00Z"
---

# Phase 03 Plan 01: Account Management API Layer Summary

Backend endpoints and frontend API actions for name update, email update, password change, and account deletion -- with integration tests covering all four operations.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Add UpdateName/UpdateEmail schemas + backend endpoints | 78447b9 | backend/src/schemas/auth.py, backend/src/routers/auth.py |
| 2 | Add integration tests for all four account management endpoints | 8fc8ca6 | backend/tests/test_auth.py |
| 3 | Add frontend API action functions for all account operations | 4522efd | frontend/lib/api/auth.actions.ts |

## What Was Built

### Backend (2 new endpoints)

**PATCH /auth/update-name**: Accepts `{name}`, fetches fresh user from DB, updates name, invalidates Redis cache, returns `{"detail": "Display name updated"}`. Uses UpdateName Pydantic schema with min_length=1, max_length=100.

**PATCH /auth/update-email**: Accepts `{new_email, password}`, fetches fresh user from DB (not cache -- password_hash needed for verification per SEC-03), verifies password via `verify_password()`, checks email uniqueness (409 on duplicate), updates email, invalidates cache. Returns `{"detail": "Email updated"}` or 401/409 on error.

Both endpoints follow the existing `try/except HTTPException: raise / except Exception` pattern with structured logging.

### Backend (4 integration tests)

- `test_update_name`: Register, update name, verify via /auth/me
- `test_update_email`: Register, update email with correct password, verify 401 on wrong password
- `test_change_password`: Register, change password, verify 401 on wrong old password
- `test_delete_account`: Register, delete account, verify /auth/me returns 401

All tests use a shared `_register_and_auth()` helper that returns Bearer token headers.

### Frontend (4 action functions)

- `updateName(name)` -- PATCH /auth/update-name
- `updateEmail(newEmail, password)` -- PATCH /auth/update-email
- `changePassword(oldPassword, newPassword)` -- POST /auth/change-password
- `deleteAccount()` -- DELETE /auth/delete-account

All use typed `apiFetch<{ detail: string }>`, no console.error (FIX-05), no try/catch (callers handle errors).

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functions are fully wired to real endpoints.

## Self-Check: PASSED

All 4 modified files exist. All 3 task commits verified (78447b9, 8fc8ca6, 4522efd).
