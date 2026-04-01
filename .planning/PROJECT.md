# SubTracker — Management System

## What This Is

A personal subscription management system consisting of a Next.js 15 web dashboard, a FastAPI backend, and an Expo React Native mobile app. Users track their recurring subscriptions, monitor spending analytics, and receive email renewal reminders. The system is self-hosted via Docker Compose with an Nginx reverse proxy.

## Core Value

Users can see exactly what they're spending on subscriptions, get notified before renewals hit, and manage everything from one place — reliably and securely.

## Requirements

### Validated

- ✓ Subscription CRUD (create, read, update, delete) — existing
- ✓ Category management with color coding — existing
- ✓ Spending analytics (by month, by category) — existing
- ✓ JWT authentication (sign-in, sign-up, forgot password) — existing
- ✓ Email renewal reminders via cron job — existing
- ✓ Currency display (USD/JPY toggle) — existing
- ✓ Docker Compose deployment with Nginx — existing
- ✓ Subscription detail page with payment history — existing
- ✓ Mobile app (Expo React Native) mirroring web features — existing

### Active

- [ ] Fix hardcoded API key in frontend bundle (currency endpoint)
- [ ] Fix JWT cookie — add HttpOnly + Secure flags, set server-side
- [ ] Remove password hash from Redis cache
- [ ] Add rate limiting on auth endpoints (login, register, password reset)
- [ ] Fix XSS in email templates (html.escape on user-supplied fields)
- [ ] Fix last_error bug appending email body on send failure
- [ ] Migrate python-jose → PyJWT (unmaintained, known CVE)
- [ ] Migrate passlib → direct bcrypt (unmaintained)
- [ ] Fix debug-level logging in production
- [ ] Fix deprecated datetime.utcnow() usage
- [ ] Add Redis connection error fallback to DB lookup
- [ ] Remove debug console.log(user) from AuthForm
- [ ] Remove double-logging in API action functions
- [ ] Settings page — Account settings (name, email, password, delete account)
- [ ] Settings page — Notification preferences (toggle, days-before-renewal)
- [ ] Settings page — Currency & locale (USD/JPY, date format, timezone)
- [ ] Settings page — Appearance (dark/light mode toggle)

### Out of Scope

- Full multi-currency support (EUR, GBP, etc.) — user confirmed USD/JPY only for now
- Analytics CSV/PDF export — existing stub, deferred
- Pause/cancel danger zone on subscription detail — existing commented-out code, deferred
- Add payment button on subscription detail — deferred
- Push notifications — email only; push channel never implemented, deferred
- Mobile app (StMS) improvements — web-first focus for this milestone
- Admin interface / multi-tenant billing — single-user personal tool

## Context

This is a brownfield project with a working but incomplete codebase. The codebase map (`.planning/codebase/`) documents the full technical state as of 2026-04-01.

**Security posture:** Several concrete security issues identified in CONCERNS.md — hardcoded API key, cookie flags missing, password hash in cache, no rate limiting, email XSS, unmaintained crypto deps. These are the top priority.

**Technical debt:** Settings page is a placeholder stub. Several UI features are incomplete or stubbed (export button, add payment, danger zone). Debug logging in production.

**Stack:** Next.js 15 (App Router) + FastAPI (async, SQLAlchemy) + PostgreSQL + Redis + Expo React Native + Nginx + Docker Compose.

**Existing patterns to follow:**
- Frontend API calls use `apiFetch()` from `lib/api/base.actions.ts`
- Backend routes follow router/schema/service layering
- Auth via JWT stored in cookie; read by Next.js middleware (`proxy.ts`)
- UI uses shadcn/ui components + Tailwind with the dark purple theme

## Constraints

- **Tech Stack**: Next.js, FastAPI, PostgreSQL, Redis — no framework changes
- **Currency**: USD/JPY only — generalizing to multi-currency is out of scope
- **Mobile**: Changes to the StMS mobile app are out of scope for this milestone
- **Design**: Preserve the existing dark purple theme; dark/light toggle should complement it
- **Auth**: JWT-based auth must remain; token delivery mechanism moving to server-set HttpOnly cookie

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Currency proxy via backend | API key must not be in frontend bundle | — Pending |
| HttpOnly cookie set server-side | Client-side JS cannot set HttpOnly flags | — Pending |
| PyJWT over python-jose | python-jose has CVE-2022-29217, unmaintained | — Pending |
| Direct bcrypt over passlib | passlib unmaintained since 2020 | — Pending |
| slowapi for rate limiting | FastAPI-native, minimal friction | — Pending |
| Settings page as tabbed sections | Account / Notifications / Display — clean UX for 4 feature groups | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after initialization*
