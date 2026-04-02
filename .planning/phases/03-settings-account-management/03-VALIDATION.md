---
phase: 3
slug: settings-account-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (backend); no frontend test framework configured |
| **Config file** | `backend/tests/conftest.py` |
| **Quick run command** | `cd backend && python -m pytest tests/test_auth.py -x` |
| **Full suite command** | `cd backend && python -m pytest tests/ -x` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_auth.py -x`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -x`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | SETT-01 | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "update_name"` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | SETT-02 | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "update_email"` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | SETT-03 | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "change_password"` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 0 | SETT-04 | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "delete_account"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_auth.py` — add test functions for `update_name`, `update_email`, `change_password`, `delete_account` (only register+login exist currently)

*Frontend has no test framework configured — all frontend testing is manual/visual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings page renders with Account tab | SETT-01 | No frontend test framework | Navigate to /settings, verify Account tab visible, check display name field |
| Display name update reflected across app | SETT-01 | Visual/cross-component | Update name, check header/navbar shows new name |
| Email update UI flow | SETT-02 | No frontend test framework | Submit new email, verify success toast, re-login with new email |
| Password change UI flow | SETT-03 | No frontend test framework | Submit wrong current password (expect error), then correct (expect success) |
| Delete account confirmation dialog | SETT-04 | No frontend test framework | Trigger delete, verify dialog appears, confirm, verify redirect to login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
