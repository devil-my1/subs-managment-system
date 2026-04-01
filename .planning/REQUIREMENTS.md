# Requirements: SubTracker — Security & Settings Milestone

**Defined:** 2026-04-01
**Core Value:** Users can see exactly what they're spending on subscriptions, get notified before renewals hit, and manage everything from one place — reliably and securely.

---

## v1 Requirements

### Security Hardening

- [ ] **SEC-01**: Currency API key is not exposed in the frontend bundle — proxied through backend
- [ ] **SEC-02**: JWT cookie is set server-side with HttpOnly and Secure flags
- [ ] **SEC-03**: Redis cache does not store password hashes
- [ ] **SEC-04**: Auth endpoints (login, register, password reset) are rate limited
- [ ] **SEC-05**: Email templates escape all user-supplied HTML (title, URL, dates)
- [ ] **SEC-06**: `last_error` field stores only the error string, not email body content
- [ ] **SEC-07**: JWT signing uses PyJWT (replaces unmaintained python-jose)
- [ ] **SEC-08**: Password hashing uses direct bcrypt (replaces unmaintained passlib)

### Code Quality Fixes

- [ ] **FIX-01**: Production logging uses INFO level (not DEBUG)
- [ ] **FIX-02**: `datetime.utcnow()` replaced with `datetime.now(timezone.utc)`
- [ ] **FIX-03**: Redis connection failure falls back to DB lookup (no hard 500 errors)
- [ ] **FIX-04**: Debug `console.log(user)` removed from AuthForm
- [ ] **FIX-05**: API action functions do not double-log errors

### Settings Page — Account

- [ ] **SETT-01**: User can update their display name
- [ ] **SETT-02**: User can update their email address
- [ ] **SETT-03**: User can change their password (requires current password)
- [ ] **SETT-04**: User can delete their account (with confirmation dialog)

### Settings Page — Notifications

- [ ] **SETT-05**: User can toggle email renewal reminders on/off
- [ ] **SETT-06**: User can set how many days before renewal to receive a reminder

### Settings Page — Display

- [ ] **SETT-07**: User can switch between USD and JPY display currency
- [ ] **SETT-08**: User can choose date format (MM/DD/YYYY or DD/MM/YYYY)
- [ ] **SETT-09**: User can set their timezone for renewal date display
- [ ] **SETT-10**: User can toggle dark/light mode

---

## v2 Requirements (Deferred)

### Analytics

- **ANLY-01**: User can export spending data as CSV
- **ANLY-02**: User can export analytics charts as PDF

### Subscription Detail

- **SUB-01**: User can manually add a payment record from the detail page
- **SUB-02**: User can pause or cancel a subscription from the detail page

### Mobile App

- **MOB-01**: Mobile app reflects settings changes (currency, dark mode)
- **MOB-02**: Explore tab replaced with real content

### Multi-Currency

- **CURR-01**: Support for EUR, GBP, AUD, CAD and other ISO 4217 currencies

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-currency (EUR/GBP/etc.) | User confirmed USD/JPY only for this milestone |
| Push notifications | Email only; push never implemented, high complexity |
| Admin interface | Single-user personal tool |
| Mobile app changes | Web-first focus; mobile deferred |
| OAuth / social login | Email/password auth sufficient |
| Analytics export | Stub exists; deferred to v2 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 1 | Pending |
| SEC-08 | Phase 1 | Pending |
| FIX-01 | Phase 2 | Pending |
| FIX-02 | Phase 2 | Pending |
| FIX-03 | Phase 2 | Pending |
| FIX-04 | Phase 2 | Pending |
| FIX-05 | Phase 2 | Pending |
| SETT-01 | Phase 3 | Pending |
| SETT-02 | Phase 3 | Pending |
| SETT-03 | Phase 3 | Pending |
| SETT-04 | Phase 3 | Pending |
| SETT-05 | Phase 4 | Pending |
| SETT-06 | Phase 4 | Pending |
| SETT-07 | Phase 5 | Pending |
| SETT-08 | Phase 5 | Pending |
| SETT-09 | Phase 5 | Pending |
| SETT-10 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after roadmap creation*
