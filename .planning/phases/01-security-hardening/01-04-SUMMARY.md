---
phase: 01-security-hardening
plan: 4
subsystem: backend-email
tags: [security, xss, email-templates, jobs, html-escaping]
dependency_graph:
  requires: []
  provides: [SEC-05, SEC-06]
  affects: [backend/src/services/email_templates.py, backend/src/routers/jobs.py]
tech_stack:
  added: []
  patterns: [html.escape() for user-supplied fields in HTML output]
key_files:
  created:
    - backend/tests/test_email_templates.py
  modified:
    - backend/src/services/email_templates.py
    - backend/src/routers/jobs.py
decisions:
  - amount not escaped (server-generated f-string, not user-supplied)
  - renewal_date.isoformat() not escaped (Python date object, server-controlled)
  - renewal_subject() also escapes title to close subject-injection vector
  - last_error stores only str(e)[:500] — no email body content persisted on failure
metrics:
  duration: 198s
  completed: "2026-04-01"
  tasks_completed: 2
  files_modified: 3
---

# Phase 01 Plan 04: Email XSS Prevention and last_error Data Leakage Fix Summary

Applied html.escape() to all user-supplied fields in email templates (title, url) and removed email.body concatenation from last_error assignment in jobs.py.

## What Changed

### Task 1: html.escape() in email_templates.py (TDD — RED/GREEN)

**File:** `backend/src/services/email_templates.py`

Added `import html` and applied escaping to the two user-supplied fields:

- `renewal_subject()`: wraps `title` in `html.escape()` before f-string interpolation
- `renewal_html()`: computes `safe_title = html.escape(title)` and `safe_url = html.escape(url) if url else None` before interpolation

Fields intentionally NOT escaped (server-generated):
- `amount`: formatted server-side as `f"{float(sub.amount):.2f} {sub.currency}"`
- `renewal_date.isoformat()`: a Python `date` object, never user-supplied
- `days_left`: an integer

### Task 2: Fix last_error in jobs.py

**File:** `backend/src/routers/jobs.py`

Removed the ternary expression that appended `email.body` to `last_error` on send failure.

Before:
```python
reminder.last_error = str(e)[:500] + email.body if 'email' in locals() else str(e)[:500]
```

After:
```python
reminder.last_error = str(e)[:500]
```

This prevents sensitive subscription HTML (containing user data from the email body) from being persisted to the `last_error` column in the database when `resend.Emails.send()` raises an exception.

## Verification Results

```
# email.body check
$ grep -n "email\.body" src/routers/jobs.py
(no output — email.body is gone)

# html.escape presence
$ grep -n "html\.escape\|import html" src/services/email_templates.py
2: import html
6:     return f"Renewal reminder: {html.escape(title)} ({renewal_date.isoformat()})"
9:     safe_title = html.escape(title)
10:    safe_url = html.escape(url) if url else None

# XSS test
ALL EMAIL TEMPLATE XSS CHECKS PASSED

# pytest
10 passed in 0.04s
```

## Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| TDD RED | e729564 | test | Failing tests for email_templates XSS prevention |
| Task 1 GREEN | 9b8e8ef | feat | Apply html.escape() to user-supplied fields |
| Task 2 | bbb1671 | fix | Remove email.body concatenation from last_error |

## Decisions Made

1. **amount not escaped** — formatted by the jobs router as `f"{float(sub.amount):.2f} {sub.currency}"`, a server-controlled string. Escaping would not add security and risks double-encoding for future legitimate uses.
2. **renewal_date.isoformat() not escaped** — a Python `date` object converted server-side; cannot contain user-supplied HTML.
3. **renewal_subject() also escapes title** — subject lines can be used in phishing/injection attacks if rendered by certain email clients; closed as defence in depth.
4. **No amount escaping** — consistent with D-15 (only user-supplied fields are escaped).

## Deviations from Plan

None — plan executed exactly as written. TDD flow followed for Task 1 (RED commit before GREEN commit).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: backend/src/services/email_templates.py
- FOUND: backend/src/routers/jobs.py
- FOUND: .planning/phases/01-security-hardening/01-04-SUMMARY.md
- FOUND: e729564 (TDD RED commit)
- FOUND: 9b8e8ef (Task 1 GREEN commit)
- FOUND: bbb1671 (Task 2 fix commit)
