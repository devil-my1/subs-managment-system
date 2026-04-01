# Coding Conventions

**Analysis Date:** 2026-04-01

---

## Project Overview

Three sub-projects with distinct conventions:
- `frontend/` — Next.js 16 (TypeScript, React 19)
- `StMS/` — Expo/React Native (TypeScript, React 19)
- `backend/` — Python 3, FastAPI, SQLAlchemy

---

## Frontend (Next.js) Conventions

### Naming Patterns

**Files:**
- React page components: `page.tsx` inside Next.js route folders (e.g., `app/(i)/dashboard/page.tsx`)
- Layout files: `layout.tsx` (e.g., `app/(auth)/layout.tsx`)
- React components: `PascalCase.tsx` (e.g., `AddSubDialog.tsx`, `AuthForm.tsx`, `StatCard.tsx`)
- Shadcn/UI primitive wrappers: `kebab-case.tsx` under `components/ui/` (e.g., `badge.tsx`, `dropdown-menu.tsx`)
- API action modules: `<domain>.actions.ts` (e.g., `auth.actions.ts`, `subs.actions.ts`)
- Hooks: `use<Name>.ts` with camelCase, starting with `use` (e.g., `useGetUser.ts`)
- Type declaration file: `types/index.d.ts`
- Utility helpers: `lib/utils.ts`
- Context files: `<Name>Context.tsx` (e.g., `CurrencyContext.tsx`)

**Functions:**
- React components: `PascalCase` default exports (e.g., `export default function AddSubDialog(...)`)
- Named helper exports: camelCase (e.g., `export function useCurrency()`, `export async function login(...)`)
- Event handlers: `handle<Action>` pattern (e.g., `handleOpenChange`, `handleRowClick`)
- Submit handlers: `onSubmit` (react-hook-form convention)
- Internal async fetchers: camelCase, descriptive (e.g., `fetchData`, `loadCategories`, `fetchUser`)

**Variables:**
- State variables: camelCase noun (e.g., `subs`, `monthlySpend`, `userCategories`)
- Boolean state: plain noun or `is`/`loading` prefix (e.g., `submitting`, `isLoading`, `open`)
- Constants: `SCREAMING_SNAKE_CASE` for module-level constants (e.g., `RATE_CACHE_TTL_MS`, `CATEGORY_COLORS`)

**Types & Interfaces:**
- Interfaces and types: `PascalCase` (e.g., `interface AddSubDialogProps`, `type FormValues`)
- Props interfaces: `<ComponentName>Props` (e.g., `AddSubDialogProps`, `UseGetUserResult`)
- Type aliases for primitives: `type UUID = string`, `type BillingPeriod = "monthly" | "yearly"`

### Code Style (Prettier)

Config: `frontend/.prettierrc`

| Rule | Value |
|---|---|
| Trailing commas | None (`"trailingComma": "none"`) |
| Indentation | Tabs (`"useTabs": true`) |
| Tab width | 2 |
| Semicolons | Off (`"semi": false`) |
| String quotes | Double (`"singleQuote": false`) |
| JSX quotes | Single (`"jsxSingleQuote": true`) |
| Arrow function parens | Avoid (`"arrowParens": "avoid"`) |
| Attribute per line | One per line (`"singleAttributePerLine": true`) |

### Linting

Config: `frontend/eslint.config.mjs`

- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rule overrides beyond default Next.js rules
- `eslint-disable-next-line react-hooks/exhaustive-deps` comments are present where deps are intentionally omitted (e.g., `hooks/useGetUser.ts`)

### TypeScript

Config: `frontend/tsconfig.json`

- `"strict": true` — full strict mode enabled
- `"target": "ES2017"`
- `"moduleResolution": "bundler"`
- `"paths": { "@/*": ["./*"] }` — root-relative path alias
- No `noImplicitAny` override; `strict` covers it
- `skipLibCheck: true`
- `.tsx` files use `"jsx": "react-jsx"`

### Import Organization

Ordered by `importOrder` in `.prettierrc` (enforced with `prettier-plugin-sort-imports`):

1. Third-party modules
2. `@/components/...`
3. `@/layout/...`
4. `@/ui/...`
5. `@/providers/...`
6. `@/constraints/...`
7. `@/types/...`
8. `@/assets/...`
9. `@/config/...`
10. `@/store/...`
11. `@/hooks/...`
12. `@/utils/...`
13. `@/api/...`
14. Relative parent imports (`../`)
15. Relative sibling imports (`./`)
16. SCSS files

Groups are separated by blank lines (`"importOrderSeparation": true`). Specifiers within a group are sorted (`"importOrderSortSpecifiers": true`).

**Path alias:** `@/` resolves to the `frontend/` root.

### Component Patterns

- All components are **functional components** — no class components anywhere.
- Components that use browser APIs or hooks must be marked `"use client"` at the top (e.g., `AddSubDialog.tsx`, `AuthForm.tsx`, `CurrencyContext.tsx`).
- Forms use `react-hook-form` with `zodResolver` for validation. Schema is defined in the same file as the component using `z.object(...)`.
- Dialog/modal state is managed with a `controlledOpen ?? internalOpen` pattern, supporting both controlled and uncontrolled usage.
- Context providers expose a custom hook (`use<ContextName>`) that throws if used outside the provider (e.g., `useCurrency` in `CurrencyContext.tsx`).
- `useMemo` and `useCallback` are used to stabilize values passed to context and child components.
- Cleanup flags (`let active = true / alive = true`) are used in async `useEffect` callbacks to prevent state updates after unmount.

### Error Handling (Frontend)

- API action functions in `lib/api/*.actions.ts` use `try/catch` and log to `console.error(...)` on failure, then rethrow or return null/empty.
- UI components catch errors from API calls and display error strings in state (e.g., `setError(message)` + `<p className='text-red-400'>{error}</p>`).
- Form submission errors are surfaced via `sonner` toast notifications (`toast.success(...)` / `toast.error(...)`).
- A leftover `console.log(user)` exists in `components/AuthForm.tsx` line 88 (debug artifact).

### Comments and Documentation

- JSDoc-style `/** ... */` comments are used on exported API functions in `lib/api/auth.actions.ts` (e.g., `@param`, `@returns`).
- Inline comments are used sparingly, only for non-obvious logic (e.g., `// eslint-disable-next-line`, cache expiry constants).
- Type file `types/index.d.ts` uses inline comments for field semantics: `// ISO 4217 code`, `// ISO date`.
- No documentation framework (Storybook, Typedoc) is configured.

---

## StMS (React Native / Expo) Conventions

### Naming Patterns

**Files:**
- Route files: lowercase with hyphens inside Expo Router folders (e.g., `sign-in.tsx`, `forgot-password.tsx`)
- Layout files: `_layout.tsx`
- Components: `PascalCase.tsx` for layout components (e.g., `AppHeader.tsx`, `StatCard.tsx`); `kebab-case.tsx` for generic primitives (e.g., `haptic-tab.tsx`, `themed-text.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-color-scheme.ts`, `use-dashboard-data.ts`, `use-theme-color.ts`)
- API modules: `lib/api/<domain>.ts` (e.g., `analytics.ts`, `auth.ts`, `subscriptions.ts`)

**Note:** StMS uses `kebab-case` for hook filenames (unlike the frontend's `camelCase`). This is an inconsistency between the two TypeScript sub-projects.

### TypeScript

Config: `StMS/tsconfig.json`

- Extends `expo/tsconfig.base`
- `"strict": true`
- `"paths": { "@/*": ["./*"] }` — same alias as frontend

### Linting

Config: `StMS/eslint.config.js`

- Extends `eslint-config-expo/flat`
- No custom rule overrides
- CommonJS module format (`require`) unlike frontend's ESM

### Component Patterns

- All components are functional with React Native `StyleSheet` for styling.
- `StyleSheet.create(...)` is defined at module bottom, after the component.
- `useThemeColor` hook is used for theme-aware color values.
- Named exports preferred for components (e.g., `export function StatCard(...)`).
- Semicolons are used (unlike frontend which omits them).

---

## Backend (Python / FastAPI) Conventions

### Naming Patterns

**Files:**
- Router files: `<domain>.py` (e.g., `subscriptions.py`, `analytics.py`, `auth.py`)
- Schema files: `<domain>.py` inside `src/schemas/` (e.g., `subscriptions.py`, `auth.py`)
- Model files: `<domain>.py` inside `src/models/`
- Service files: `<domain>.py` inside `src/services/`
- Utility files: `<purpose>.py` inside `src/utils/` (e.g., `cache.py`, `logs.py`)

**Functions and variables:**
- All function names and variables: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `GENERIC_ERROR = "..."`)
- Class names: `PascalCase` (e.g., `SubscriptionStatus`, `SubscriptionCreate`, `Settings`)
- Enum values: lowercase strings matching their string value (e.g., `active = "active"`)

**Route handlers:**
- Named descriptively using verbs: `list_subscriptions`, `create_subscription`, `update_subscription`, `delete_subscription`

### Python Code Style

- No `black`, `ruff`, or `flake8` configuration detected — formatting is informal/manual.
- 4-space indentation (PEP 8).
- Type annotations used throughout: function parameters, return types, and SQLAlchemy `Mapped[...]` columns.
- Python 3.10+ union syntax used: `str | None`, `UUID | None` (no `Optional[...]`).
- Pydantic v2 (`BaseModel`, `ConfigDict`, `Field`, `model_dump()`, `model_validate()`).

### Schemas

- Pydantic schemas follow a `Base → Create/Update → Out` inheritance pattern:
  - `SubscriptionBase` — shared fields
  - `SubscriptionCreate(SubscriptionBase)` — add-only fields
  - `SubscriptionUpdate(BaseModel)` — all fields optional
  - `SubscriptionOut(SubscriptionBase)` — adds `id`, `user_id`, `ConfigDict(from_attributes=True)`

### Error Handling (Backend)

- Every router function wraps body in `try/except HTTPException: raise / except Exception as e`.
- All non-HTTP exceptions are logged with `.exception(...)` before being re-raised as `HTTPException(status_code=500, detail="...")`.
- User-facing error messages are generic and never expose internals (e.g., `"Unable to load subscriptions list. Please try again later."`).
- 404s are raised inline: `raise HTTPException(404, "Subscription not found.")`.

### Logging (Backend)

Config: `backend/src/utils/logs.py`

- Domain-specific loggers via `setup_logger(name, level)` using Python's `logging.StreamHandler`.
- Format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
- Loggers: `app_logger` (DEBUG), `auth_logger` (INFO), `analytics_logger` (INFO), `jobs_logger` (INFO), `subscriptions_logger` (INFO)
- Structured context via `extra={"user_id": ..., "subscription_id": ...}` dict on each log call.
- Use the domain-specific logger (e.g., `subscriptions_logger.info("subscription_created", extra={...})`) — not `print()` or `app_logger`.

### SQLAlchemy Models

- Use `Mapped[type]` and `mapped_column(...)` declarative style (SQLAlchemy 2.0).
- `__table_args__` used to define composite indexes inline with the model.
- Relationships defined with `relationship(...)` and `back_populates`.
- Enums defined as `str, enum.Enum` subclasses in the same model file, then used in `Enum(...)` column type.

---

## Cross-Project Patterns

| Pattern | Frontend | StMS | Backend |
|---|---|---|---|
| Strict TypeScript / type hints | Yes | Yes | Yes (Python type hints) |
| Zod validation | Yes (forms) | No | No (Pydantic) |
| Async/await | Yes | Yes | Yes (asyncio) |
| Error surfaced to user | Toast (sonner) | N/A (in progress) | HTTPException detail string |
| Auth token | Cookie (`token=`) | AsyncStorage | JWT Bearer header |

---

*Convention analysis: 2026-04-01*
