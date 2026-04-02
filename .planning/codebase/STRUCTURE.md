# Codebase Structure

**Analysis Date:** 2026-04-01

## Directory Layout

```
my-managment-system/              # Monorepo root
├── frontend/                     # Next.js 15 web app (SubTracker dashboard)
├── backend/                      # FastAPI Python API server
├── StMS/                         # Expo React Native mobile app
├── nginx/                        # Nginx reverse-proxy configuration
├── scripts/                      # Root-level ops scripts
├── docker-compose.yml            # Full-stack container orchestration
├── .gitignore                    # Root gitignore
└── README.md                     # Project overview
```

---

## Frontend (`frontend/`)

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout — wraps CurrencyProvider + Toaster
│   ├── page.tsx                  # Root redirect page
│   ├── globals.css               # Global Tailwind + CSS vars
│   ├── (auth)/                   # Auth route group (unauthenticated)
│   │   ├── layout.tsx            # Auth shell layout
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── forgot-password/page.tsx
│   └── (i)/                      # Authenticated app route group
│       ├── dashboard/page.tsx
│       ├── analytics/page.tsx
│       ├── subscriptions/page.tsx
│       ├── subscriptions/[id]/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── layout/
│   │   ├── Shell.tsx             # Page wrapper: Sidebar + MobileNav + content area
│   │   ├── Sidebar.tsx           # Desktop persistent sidebar
│   │   └── MobileNav.tsx        # Hamburger sheet menu for mobile
│   ├── ui/                       # shadcn/ui primitives + custom base UI
│   │   ├── SectionCard.tsx       # Reusable card container
│   │   ├── badge.tsx, button.tsx, calendar.tsx, checkbox.tsx
│   │   ├── dialog.tsx, dropdown-menu.tsx, field.tsx, form.tsx
│   │   ├── input.tsx, input-otp.tsx, label.tsx, popover.tsx
│   │   ├── radio-group.tsx, select.tsx, separator.tsx, sheet.tsx
│   │   ├── sonner.tsx, switch.tsx, table.tsx, tabs.tsx, textarea.tsx
│   ├── analytics/
│   │   ├── BarChart.tsx
│   │   └── DonutChart.tsx
│   ├── AddSubDialog.tsx          # Add subscription modal form
│   ├── AddCategoryDialog.tsx     # Add category modal form
│   ├── AuthForm.tsx              # Shared sign-in / sign-up form
│   ├── CustomFormField.tsx       # Reusable react-hook-form field wrapper
│   ├── ForgotPasswordForm.tsx
│   ├── Loader.tsx                # Spinner component
│   ├── MonthlyChart.tsx          # Monthly spend line/bar chart
│   ├── StatCard.tsx              # KPI summary card
│   ├── SubColumns.tsx            # TanStack Table column definitions
│   └── SubTable.tsx              # TanStack Table wrapper
├── context/
│   └── CurrencyContext.tsx       # Currency state + conversion helpers (React Context)
├── hooks/
│   └── useGetUser.ts             # Fetches current authenticated user
├── lib/
│   └── api/
│       ├── base.actions.ts       # Core apiFetch() wrapper over axios; reads JWT from cookie
│       ├── auth.actions.ts       # sign-in, sign-up, forgot-password calls
│       ├── subs.actions.ts       # CRUD for subscriptions
│       ├── category.actions.ts   # CRUD for categories
│       ├── analytics.actions.ts  # Spending analytics calls
│       └── currency.actions.ts   # Exchange rate fetch
├── constants/
│   └── index.ts                  # CATEGORY_COLORS array and other shared constants
├── types/
│   └── index.d.ts                # Shared TypeScript interfaces mirroring backend schemas
├── public/                       # Static assets
├── proxy.ts                      # Next.js middleware — cookie-based auth guard + redirect logic
├── next.config.ts                # Next config — standalone output, /api/* rewrite to backend
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc
├── postcss.config.mjs
├── components.json               # shadcn/ui config
├── Dockerfile
└── pnpm-lock.yaml
```

---

## Backend (`backend/`)

```
backend/
├── src/
│   ├── main.py                   # FastAPI app factory; registers all routers at /api/v1
│   ├── api/
│   │   ├── __init__.py
│   │   └── deps.py               # FastAPI dependency injection (DB session, current user)
│   ├── core/
│   │   ├── config.py             # Pydantic Settings — reads env vars
│   │   └── security.py          # JWT creation/verification, password hashing
│   ├── db/
│   │   └── session.py            # SQLAlchemy async engine + session factory
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── base.py               # Declarative base
│   │   ├── user.py
│   │   ├── subscription.py
│   │   ├── category.py
│   │   ├── payment.py
│   │   └── reminder.py
│   ├── routers/                  # FastAPI route handlers
│   │   ├── auth.py
│   │   ├── subscriptions.py
│   │   ├── category.py
│   │   ├── analytics.py
│   │   └── jobs.py               # Background/cron-triggered job endpoints
│   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── subscriptions.py
│   │   ├── category.py
│   │   ├── analytics.py
│   │   ├── payments.py
│   │   ├── renew.py
│   │   └── common.py
│   ├── services/                 # Business logic layer
│   │   ├── subscriptions.py      # Subscription renewal, payment recording
│   │   └── email_templates.py    # HTML email template builders
│   └── utils/
│       ├── cache.py              # In-process caching helpers
│       └── logs.py               # Logging configuration
├── alembic/                      # Database migration management
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                 # Migration scripts (3 present)
├── tests/
│   ├── conftest.py               # Pytest fixtures (test DB, client, users)
│   ├── test_auth.py
│   ├── test_subscriptions.py
│   └── test_analytics.py
├── scripts/
│   ├── compose.sh                # Helper to run docker-compose commands
│   └── cron-loop.sh              # Runs renewal/reminder jobs on a schedule
├── Dockerfile
├── docker-compose.backend.yaml
├── requirements.txt
└── alembic.ini
```

---

## Mobile App (`StMS/`)

```
StMS/
├── app/                          # Expo Router file-based pages
│   ├── _layout.tsx               # Root layout — ThemeProvider + I18nProvider + AuthGate
│   ├── modal.tsx                 # Modal screen
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   └── (tabs)/
│       ├── _layout.tsx           # Tab bar configuration
│       ├── index.tsx             # Home/dashboard tab
│       ├── subscriptions.tsx
│       ├── analytics.tsx
│       ├── settings.tsx
│       └── explore.tsx
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx
│   │   ├── InfoRow.tsx
│   │   ├── QuickActionCard.tsx
│   │   ├── Section.tsx
│   │   └── StatCard.tsx
│   ├── ui/
│   │   ├── collapsible.tsx
│   │   ├── icon-symbol.tsx
│   │   └── icon-symbol.ios.tsx   # iOS-specific icon variant
│   ├── external-link.tsx
│   ├── haptic-tab.tsx
│   ├── hello-wave.tsx
│   ├── parallax-scroll-view.tsx
│   ├── themed-text.tsx
│   └── themed-view.tsx
├── context/
│   └── I18nContext.tsx           # Internationalisation context + useI18n hook
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts   # Web-specific override
│   ├── use-dashboard-data.ts
│   └── use-theme-color.ts
├── lib/
│   ├── api.ts                    # Base API client (axios, reads token from SecureStore)
│   ├── api/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── subscriptions.ts
│   │   ├── categories.ts
│   │   ├── analytics.ts
│   │   └── currency.ts
│   ├── currency-converter.ts
│   ├── i18n.ts                   # i18n strings loader
│   └── preferences.ts            # User preference storage (SecureStore)
├── constants/
│   └── theme.ts                  # Design tokens / theme constants
├── scripts/
│   └── reset-project.js          # Dev utility to reset Expo project state
├── assets/images/                # App icons, splash screen
├── app.json                      # Expo app configuration
├── tsconfig.json
└── package.json
```

---

## Infrastructure

```
nginx/
├── default.conf                  # Main Nginx config — TLS, HSTS, CSP, /api proxy, frontend proxy
└── http-only.conf                # HTTP-only config (pre-TLS / local dev)

scripts/
└── init-ssl.sh                   # Certbot SSL certificate initialisation

docker-compose.yml                # Orchestrates: frontend, backend, nginx services
```

---

## Key File Locations

**Entry Points:**
- `frontend/app/layout.tsx` — Next.js root layout, mounts providers
- `frontend/proxy.ts` — Next.js middleware, auth guard for all routes
- `backend/src/main.py` — FastAPI app instance, all router registration
- `StMS/app/_layout.tsx` — Expo root layout, AuthGate + providers

**API Client Layer:**
- `frontend/lib/api/base.actions.ts` — `apiFetch()` — all frontend HTTP calls flow through here
- `StMS/lib/api.ts` — Mobile base axios client

**Shared Types:**
- `frontend/types/index.d.ts` — TypeScript interfaces shared across all frontend code

**Configuration:**
- `frontend/next.config.ts` — Next.js config including `/api/*` rewrite to backend
- `backend/src/core/config.py` — All backend env var settings via Pydantic
- `nginx/default.conf` — Reverse-proxy routing rules

**Database Migrations:**
- `backend/alembic/versions/` — All schema migrations

---

## Naming Conventions

**Files:**
- Next.js pages: `page.tsx` (Next.js App Router convention)
- Next.js layouts: `layout.tsx`
- Components: `PascalCase.tsx` (e.g., `StatCard.tsx`, `AddSubDialog.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useGetUser.ts`, `use-dashboard-data.ts`)
- API action modules: `[domain].actions.ts` (e.g., `subs.actions.ts`)
- Backend routers: `[domain].py` (e.g., `subscriptions.py`, `analytics.py`)
- Backend schemas: `[domain].py` in `schemas/`
- Backend models: `[domain].py` in `models/`

**Directories:**
- Route groups use parentheses: `(auth)/`, `(i)/`, `(tabs)/`
- Shared primitives live in `components/ui/`
- Layout chrome lives in `components/layout/`

---

## Where to Add New Code

**New authenticated web page:**
- Page file: `frontend/app/(i)/[feature]/page.tsx`
- Wrap content in `<Shell>` from `frontend/components/layout/Shell.tsx`

**New API call (frontend):**
- Add function to existing or new `frontend/lib/api/[domain].actions.ts`
- Use `apiFetch<T>()` from `frontend/lib/api/base.actions.ts`

**New shared TypeScript type:**
- Add to `frontend/types/index.d.ts`

**New reusable component:**
- Feature-specific: `frontend/components/[ComponentName].tsx`
- Layout chrome: `frontend/components/layout/[ComponentName].tsx`
- Base UI primitive: `frontend/components/ui/[component-name].tsx`

**New backend endpoint:**
- Add route to existing `backend/src/routers/[domain].py` or create new router
- Register new router in `backend/src/main.py` with `app.include_router()`
- Add Pydantic schema to `backend/src/schemas/[domain].py`
- Business logic: `backend/src/services/[domain].py`

**New database model:**
- ORM model: `backend/src/models/[domain].py`
- Generate migration: `alembic revision --autogenerate -m "description"`
- Migration file lands in `backend/alembic/versions/`

**New mobile screen:**
- Tab screen: `StMS/app/(tabs)/[screen].tsx`
- Auth screen: `StMS/app/(auth)/[screen].tsx`
- Register in the corresponding `_layout.tsx`

**New mobile API call:**
- Add to `StMS/lib/api/[domain].ts`
- Export via `StMS/lib/api/index.ts`

---

## Special Directories

**`frontend/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`backend/.venv/`:**
- Purpose: Python virtual environment
- Generated: Yes
- Committed: No

**`backend/alembic/versions/`:**
- Purpose: Database migration scripts
- Generated: Partially (autogenerated, then edited)
- Committed: Yes

**`StMS/.expo/`:**
- Purpose: Expo CLI cache and build metadata
- Generated: Yes
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD analysis documents consumed by plan/execute commands
- Generated: Yes (by map-codebase)
- Committed: Yes

---

*Structure analysis: 2026-04-01*
