# Roadmap: SubTracker — Security & Settings Milestone

## Overview

This milestone hardens the existing SubTracker application against identified security vulnerabilities, cleans up code quality issues, and delivers a full settings page (account management, notification preferences, and display/appearance controls). Security fixes come first because they address real exposure in production. Code quality fixes follow to stabilize the codebase before new feature work. The settings page is built in three phases — account, notifications, display — each delivering an independently useful tab.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security Hardening** - Fix all identified security vulnerabilities in backend and frontend (completed 2026-04-02)
- [x] **Phase 2: Code Quality Fixes** - Resolve production logging, deprecated APIs, error handling, and debug artifacts (completed 2026-04-02)
- [ ] **Phase 3: Settings — Account Management** - Users can manage their account (name, email, password, deletion)
- [ ] **Phase 4: Settings — Notification Preferences** - Users can control email reminder behavior
- [ ] **Phase 5: Settings — Display & Appearance** - Users can customize currency, date format, timezone, and theme

## Phase Details

### Phase 1: Security Hardening
**Goal**: The application no longer exposes credentials, tokens, or user data through known vulnerability vectors
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08
**Success Criteria** (what must be TRUE):
  1. Currency conversion works without any API key present in the frontend JavaScript bundle
  2. The JWT auth cookie is HttpOnly and Secure — JavaScript cannot read it and it is not sent over plain HTTP
  3. Viewing the Redis cache for a logged-in user shows no password hash field
  4. Rapid repeated login/register/password-reset requests from the same IP are rejected with a 429 status after the configured limit
  5. A subscription with HTML tags in its title renders as escaped text in the reminder email, not as raw HTML
**Plans**: TBD

### Phase 2: Code Quality Fixes
**Goal**: Production runtime is clean — no debug noise, no deprecated warnings, no single-point-of-failure on Redis
**Depends on**: Phase 1
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05
**Success Criteria** (what must be TRUE):
  1. Backend logs at INFO level by default; no DEBUG-level output appears in production container logs
  2. No DeprecationWarning for datetime.utcnow() appears in Python 3.13 runtime
  3. When Redis is unavailable, authenticated API requests still succeed by falling back to database lookup
  4. Browser console shows no debug user object logged on login/registration
  5. A single API error produces exactly one log entry, not two
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Backend fixes: INFO logging (FIX-01), datetime.utcnow deprecation (FIX-02), Redis connection fallback (FIX-03)
- [x] 02-02-PLAN.md — Frontend fixes: remove AuthForm console.log (FIX-04), remove console.error from action files (FIX-05)

### Phase 3: Settings — Account Management
**Goal**: Users can view and manage their account identity and permanently delete their account
**Depends on**: Phase 2
**Requirements**: SETT-01, SETT-02, SETT-03, SETT-04
**Success Criteria** (what must be TRUE):
  1. User can navigate to a Settings page, see an Account tab, and update their display name — the new name appears across the app
  2. User can change their email address and subsequent login requires the new email
  3. User can change their password by providing their current password — old password no longer works
  4. User can delete their account via a confirmation dialog — after deletion, login with those credentials fails
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Backend endpoints + schemas + integration tests + frontend API action functions (SETT-01, SETT-02, SETT-03, SETT-04)
- [ ] 03-02-PLAN.md — Frontend Settings page with tabbed layout + Account tab + all four dialog components (SETT-01, SETT-02, SETT-03, SETT-04)

**UI hint**: yes

### Phase 4: Settings — Notification Preferences
**Goal**: Users control whether and when they receive email renewal reminders
**Depends on**: Phase 3
**Requirements**: SETT-05, SETT-06
**Success Criteria** (what must be TRUE):
  1. User can toggle email renewal reminders off — no reminder emails are sent for their subscriptions
  2. User can set the number of days before renewal to receive a reminder — the next reminder is scheduled according to the new value
**Plans**: TBD
**UI hint**: yes

### Phase 5: Settings — Display & Appearance
**Goal**: Users can customize how financial data, dates, and the interface theme appear
**Depends on**: Phase 4
**Requirements**: SETT-07, SETT-08, SETT-09, SETT-10
**Success Criteria** (what must be TRUE):
  1. User can switch between USD and JPY — all subscription amounts and analytics figures display in the selected currency
  2. User can choose between MM/DD/YYYY and DD/MM/YYYY — all dates throughout the app reflect the chosen format
  3. User can set their timezone — renewal dates display adjusted to the selected timezone
  4. User can toggle between dark and light mode — the interface theme switches immediately and persists across sessions
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 4/4 | Complete   | 2026-04-02 |
| 2. Code Quality Fixes | 2/2 | Complete   | 2026-04-02 |
| 3. Settings — Account Management | 0/2 | Planning complete | - |
| 4. Settings — Notification Preferences | 0/TBD | Not started | - |
| 5. Settings — Display & Appearance | 0/TBD | Not started | - |
