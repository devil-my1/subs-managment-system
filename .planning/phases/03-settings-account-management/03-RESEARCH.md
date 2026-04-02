# Phase 3: Settings -- Account Management - Research

**Researched:** 2026-04-02
**Domain:** Full-stack settings page (FastAPI backend + Next.js 16 frontend)
**Confidence:** HIGH

## Summary

Phase 3 builds a Settings page with a tabbed layout (Account / Notifications / Appearance), delivering the Account tab with four features: display name update, email update, password change, and account deletion. Two new backend endpoints (`PATCH /auth/update-name`, `PATCH /auth/update-email`) are needed. Two existing backend endpoints (`POST /auth/change-password`, `DELETE /auth/delete-account`) are reused as-is. The frontend replaces the current stub `settings/page.tsx` with a full tabbed layout and four dialog-based forms.

The codebase has strong established patterns: `react-hook-form` + `zod` for forms, `apiFetch<T>()` for HTTP calls, `sonner` toast for feedback, shadcn/ui `Dialog` for modals, and a consistent dark-purple design system. All shadcn components needed are already installed. The UI-SPEC (`03-UI-SPEC.md`) provides complete design specs.

**Primary recommendation:** Follow existing `AddSubDialog.tsx` patterns for all four dialogs. Backend endpoints are simple CRUD operations on the User model with Redis cache invalidation -- no complex business logic.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Build the full tabbed settings layout in Phase 3 -- three tabs: Account (active), Notifications (coming soon), Appearance (coming soon). No refactor needed in Phases 4/5 -- they just fill their tab.
- **D-02:** Use the existing `tabs` shadcn/ui component (`frontend/components/ui/tabs.tsx`) for the tab container.
- **D-03:** Notifications and Appearance tabs show a `"Coming soon"` placeholder (same style as the current stub card). They are NOT disabled/grayed-out -- they are clickable but show placeholder content.
- **D-04:** Show the current display name as read-only text with an Edit button. Clicking Edit opens a dialog with a prefilled input for the new name. Submit calls `PATCH /auth/update-name`. Dialog closes on success.
- **D-05:** Success feedback: Sonner toast ("Display name updated"). The displayed name refreshes immediately (call `useGetUser().refresh()`).
- **D-06:** Backend needs a new `PATCH /auth/update-name` endpoint. Payload: `{ name: string }`. Response: `{ detail: string }`. Must invalidate the user Redis cache key (`user:{user_id}`).
- **D-07:** Show current email as read-only text with an Edit button. Clicking opens a dialog with two fields: new email and current password. Submit calls `PATCH /auth/update-email`.
- **D-08:** Backend needs a new `PATCH /auth/update-email` endpoint. Payload: `{ new_email: string, password: string }`. Verifies current password before updating. Must invalidate user Redis cache key. Returns `{ detail: string }`.
- **D-09:** After successful email change: user stays logged in (session token uses user ID, not email). Show Sonner toast "Email updated". Refresh displayed email.
- **D-10:** A "Change Password" button in the Account section opens a dialog with three fields: current password, new password, confirm new password. Frontend validates new password === confirm. Submit calls the existing `POST /auth/change-password` endpoint (already implemented).
- **D-11:** Success feedback: Sonner toast "Password changed". Dialog closes. No logout.
- **D-12:** A "Danger Zone" section (visually separated, red-accented border or heading) contains a "Delete Account" button.
- **D-13:** Clicking opens a dialog explaining the action is permanent and irreversible. The user must type `DELETE` in a text input before the confirm button becomes active. This is the type-to-confirm pattern.
- **D-14:** Submit calls the existing `DELETE /auth/delete-account` endpoint. On success: clear session (call `POST /auth/logout`), then redirect to `/sign-in`.
- **D-15:** All success states use Sonner toast. Error states show toast with error variant or inline error beneath the relevant field inside the dialog.

### Claude's Discretion
- Component file structure: Claude can decide whether to put all settings dialogs in one file or split them into individual dialog components. One file is acceptable given the small number.
- Form library: Use react-hook-form (already used in AuthForm and AddSubDialog) for dialog forms. Or plain controlled inputs -- Claude's choice.
- Whether to add a `name` update to the backend `UserMe` response schema or leave it as-is -- Claude can adjust schemas as needed.
- Exact layout of the Account tab (spacing, section groupings) -- follow the app's established dark-purple palette.

### Deferred Ideas (OUT OF SCOPE)
- Email verification flow (send a verification link to the new email before updating) -- not in scope. Direct update with password confirmation is sufficient.
- "Force logout all devices" on password change -- not in scope.
- Avatar/profile photo upload -- not in scope (no requirement).
- Account suspension / soft delete -- not in scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETT-01 | User can update their display name | New `PATCH /auth/update-name` backend endpoint + `updateName()` frontend action + `EditNameDialog` component |
| SETT-02 | User can update their email address | New `PATCH /auth/update-email` backend endpoint + `updateEmail()` frontend action + `EditEmailDialog` component |
| SETT-03 | User can change their password (requires current password) | Existing `POST /auth/change-password` backend endpoint + new `changePassword()` frontend action + `ChangePasswordDialog` component |
| SETT-04 | User can delete their account (with confirmation dialog) | Existing `DELETE /auth/delete-account` backend endpoint + new `deleteAccount()` frontend action + `DeleteAccountDialog` component |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.69.0 | Form state management | Already used in AddSubDialog, AuthForm |
| zod | ^4.2.1 | Schema validation | Already used with zodResolver |
| @radix-ui/react-tabs | ^1.1.13 | Tab container primitive | Already installed, used via shadcn tabs component |
| @radix-ui/react-dialog | ^1.1.15 | Dialog primitive | Already installed, used in AddSubDialog |
| sonner | ^2.0.7 | Toast notifications | Already used for success/error feedback |
| axios | ^1.13.2 | HTTP client | Already used via apiFetch wrapper |
| lucide-react | ^0.562.0 | Icons | Already used throughout the app |

### Backend (already installed -- no new packages)

| Library | Version | Purpose |
|---------|---------|---------|
| FastAPI | existing | API framework |
| Pydantic v2 | existing | Request/response schemas with `EmailStr`, `Field` |
| SQLAlchemy 2.0 | existing | ORM with async session |
| bcrypt | existing | Password verification in update-email endpoint |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | Plain controlled inputs | RHF already in codebase, provides validation integration with zod -- use it |
| Individual dialog files | Single large file | Split into 4 files for clarity per UI-SPEC component inventory |

**Installation:** No new packages needed. Zero install commands.

## Architecture Patterns

### Recommended Project Structure

```
frontend/
  app/(i)/settings/page.tsx           # Replaces stub -- renders Shell + Tabs
  components/settings/
    AccountTab.tsx                     # Client component -- Profile, Security, Danger Zone sections
    EditNameDialog.tsx                 # Dialog for display name update
    EditEmailDialog.tsx                # Dialog for email update
    ChangePasswordDialog.tsx           # Dialog for password change
    DeleteAccountDialog.tsx            # Dialog for account deletion
  lib/api/auth.actions.ts             # Add: updateName(), updateEmail(), changePassword(), deleteAccount()

backend/
  src/routers/auth.py                 # Add: PATCH /auth/update-name, PATCH /auth/update-email
  src/schemas/auth.py                 # Add: UpdateName, UpdateEmail schemas
```

### Pattern 1: Dialog + Form (from AddSubDialog.tsx)

**What:** Each dialog is a client component combining shadcn Dialog + react-hook-form + zod schema.
**When to use:** All four settings dialogs.
**Key elements from codebase:**
- Zod schema defined at top of file
- `useForm<FormValues>({ resolver: zodResolver(schema) })`
- `submitting` state to disable buttons during API call
- `toast.success()` / `toast.error()` for feedback
- Dialog `onOpenChange` to reset form on close

### Pattern 2: API Action Function (from auth.actions.ts)

**What:** Thin wrapper around `apiFetch<T>()` in `lib/api/auth.actions.ts`.
**Key elements:**
- Typed return: `apiFetch<{ detail: string }>(path, { method, body })`
- Caller handles error (try/catch in dialog component)
- No console.error inside action functions (FIX-05 from Phase 2)

### Pattern 3: Backend Endpoint (from existing auth.py)

**What:** FastAPI router function with `Depends(get_current_user)` for auth, `Depends(get_db)` for DB access.
**Key elements:**
- Wrap body in `try/except HTTPException: raise / except Exception as e`
- Log with `auth_logger.info()` on success, `auth_logger.exception()` on error
- Invalidate Redis cache: `await cache_delete_key(f"user:{user.id}")`
- Return `Message` schema (`{"detail": "..."}`)

### Anti-Patterns to Avoid
- **Do NOT duplicate backend logic:** `change-password` and `delete-account` endpoints already exist. Do not create new endpoints for these -- only create frontend action wrappers.
- **Do NOT build a global user context provider:** `useGetUser()` hook already handles user state. Call `.refresh()` after mutations.
- **Do NOT use `console.log` or `console.error` in API action functions:** Phase 2 (FIX-04, FIX-05) explicitly removed these.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | zod schemas + zodResolver | Already established pattern, handles error messages |
| Tab navigation | Custom tab state management | Radix Tabs primitive (shadcn) | Handles keyboard nav, ARIA, active state |
| Dialog focus trap | Manual focus management | Radix Dialog primitive (shadcn) | Handles focus trap, Escape close, overlay |
| Toast notifications | Custom notification system | Sonner | Already integrated in the app |
| Password hashing verification | Custom crypto | bcrypt via `verify_password()` | Already implemented in `security.py` |
| User data refresh | Custom event system | `useGetUser().refresh()` | Already returns `refresh` function |

## Common Pitfalls

### Pitfall 1: Missing Frontend Action Functions
**What goes wrong:** The UI-SPEC lists `changePassword()` and `deleteAccount()` as "Existing Actions to Reuse" but they DO NOT EXIST in `auth.actions.ts`. Only `login()`, `register()`, `requestPasswordReset()`, `verifyPasswordReset()`, `confirmPasswordReset()`, and `logout()` exist.
**Why it happens:** The backend endpoints exist, but nobody wrote the frontend wrappers yet.
**How to avoid:** Create all four frontend action functions: `updateName()`, `updateEmail()`, `changePassword()`, `deleteAccount()`.
**Warning signs:** TypeScript import errors when building dialog components.

### Pitfall 2: Email Uniqueness Constraint
**What goes wrong:** The `update-email` endpoint updates the email without checking if another user already has that email, causing a database unique constraint violation (500 error).
**Why it happens:** The User model has `unique=True` on the email column. A raw DB error is not user-friendly.
**How to avoid:** In the `PATCH /auth/update-email` endpoint, query for existing user with the new email before updating. Return 409 with "An account with this email already exists" if found.
**Warning signs:** Unhandled IntegrityError from SQLAlchemy.

### Pitfall 3: Redis Cache Stale After Update
**What goes wrong:** After updating name or email, the cached user object in Redis still has the old values. Next page load shows old data.
**Why it happens:** `get_current_user` in `deps.py` reads from Redis cache first. If cache is not invalidated, stale data persists.
**How to avoid:** Call `await cache_delete_key(f"user:{user.id}")` after every user mutation (name update, email update). The existing `change-password` and `delete-account` endpoints already do this correctly.
**Warning signs:** Updated name/email reverts on page refresh.

### Pitfall 4: Password Field in Update-Email Not Verified Against DB
**What goes wrong:** The `get_current_user` dependency returns a User object from cache that does NOT contain `password_hash`. Calling `verify_password()` on it fails.
**Why it happens:** The Redis cache deliberately excludes `password_hash` (SEC-03). The cached User object has no `password_hash` attribute.
**How to avoid:** In the `update-email` endpoint, fetch a fresh user from DB (like `change-password` does): `res = await db.execute(select(User).where(User.id == user.id)); db_user = res.scalar_one_or_none()`. Then verify password against `db_user.password_hash`.
**Warning signs:** AttributeError or incorrect password verification when using cached user object.

### Pitfall 5: Delete Account Cookie Not Cleared
**What goes wrong:** After deleting the account, the user's JWT cookie is still set. The next API call with that cookie hits `get_current_user` which fails with "User not found" (401), but the browser still tries to load authenticated pages.
**Why it happens:** `DELETE /auth/delete-account` does not clear the cookie -- it only deletes the DB record and Redis cache.
**How to avoid:** Frontend calls `logout()` (which calls `POST /auth/logout` to clear the cookie) after successful deletion, THEN redirects to `/sign-in`. The backend delete endpoint does not need to clear the cookie since the frontend handles it.
**Warning signs:** User sees 401 errors briefly before redirect.

### Pitfall 6: Form Reset on Dialog Close
**What goes wrong:** User opens Edit Name dialog, types a new name, closes without saving, reopens -- the old typed value persists.
**Why it happens:** react-hook-form does not auto-reset when the dialog unmounts (Dialog keeps children mounted by default in Radix).
**How to avoid:** Call `form.reset()` in the dialog's `onOpenChange` handler when `open` becomes false. This is the existing pattern in `AddSubDialog.tsx` (line 158).
**Warning signs:** Stale form values appearing when dialogs reopen.

## Code Examples

### Backend: New Pydantic Schemas (auth.py)

```python
# Add to backend/src/schemas/auth.py

class UpdateName(BaseModel):
    name: str = Field(min_length=1, max_length=100)

class UpdateEmail(BaseModel):
    new_email: EmailStr
    password: str = Field(min_length=8, max_length=128)
```

### Backend: PATCH /auth/update-name Endpoint Pattern

```python
# Add to backend/src/routers/auth.py
# Follows existing change-password pattern

@router.patch("/update-name", response_model=Message)
async def update_name(
    payload: UpdateName,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        res = await db.execute(select(User).where(User.id == user.id))
        db_user = res.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=401, detail="User not found")
        db_user.name = payload.name
        await db.commit()
        await cache_delete_key(f"user:{db_user.id}")
        auth_logger.info("name_updated", extra={"user_id": str(db_user.id)})
        return {"detail": "Display name updated"}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception("name_update_error", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=500, detail="Could not update name. Please try again later.") from e
```

### Backend: PATCH /auth/update-email Endpoint Pattern

```python
# Key difference from update-name: must verify password and check email uniqueness

@router.patch("/update-email", response_model=Message)
async def update_email(
    payload: UpdateEmail,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        # Fresh user from DB (cache does not store password_hash)
        res = await db.execute(select(User).where(User.id == user.id))
        db_user = res.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=401, detail="User not found")

        if not verify_password(payload.password, db_user.password_hash):
            raise HTTPException(status_code=401, detail="Incorrect password")

        # Check uniqueness
        existing = await db.execute(select(User).where(User.email == payload.new_email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        db_user.email = payload.new_email
        await db.commit()
        await cache_delete_key(f"user:{db_user.id}")
        auth_logger.info("email_updated", extra={"user_id": str(db_user.id), "new_email": payload.new_email})
        return {"detail": "Email updated"}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception("email_update_error", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=500, detail="Could not update email. Please try again later.") from e
```

### Frontend: API Action Functions Pattern

```typescript
// Add to frontend/lib/api/auth.actions.ts

export async function updateName(name: string) {
	return apiFetch<{ detail: string }>("/auth/update-name", {
		method: "PATCH",
		body: JSON.stringify({ name })
	})
}

export async function updateEmail(newEmail: string, password: string) {
	return apiFetch<{ detail: string }>("/auth/update-email", {
		method: "PATCH",
		body: JSON.stringify({ new_email: newEmail, password })
	})
}

export async function changePassword(oldPassword: string, newPassword: string) {
	return apiFetch<{ detail: string }>("/auth/change-password", {
		method: "POST",
		body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
	})
}

export async function deleteAccount() {
	return apiFetch<{ detail: string }>("/auth/delete-account", {
		method: "DELETE"
	})
}
```

### Frontend: Dialog Component Pattern (EditNameDialog example skeleton)

```typescript
// frontend/components/settings/EditNameDialog.tsx
// Follows AddSubDialog pattern

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateName } from "@/lib/api/auth.actions"
import { toast } from "sonner"
import { Loader } from "lucide-react"

const schema = z.object({
	name: z.string().min(1, "Name is required").max(100)
})

type FormValues = z.infer<typeof schema>

interface EditNameDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentName: string
	onSuccess: () => void
}

// Component implementation follows AddSubDialog structure:
// - useState for submitting
// - form.reset() on dialog close
// - try/catch in onSubmit with toast feedback
// - Loader spinner during submission
```

### Frontend: Delete Account Type-to-Confirm Pattern

```typescript
// Key validation: confirm button disabled until input === "DELETE"
const schema = z.object({
	confirmation: z.literal("DELETE", {
		errorMap: () => ({ message: "Type DELETE to confirm" })
	})
})

// In JSX: disabled={confirmation !== "DELETE"}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| passlib for password hashing | Direct bcrypt | Phase 1 (SEC-08) | `verify_password()` in `security.py` uses bcrypt directly |
| python-jose for JWT | PyJWT | Phase 1 (SEC-07) | `decode_token()` in `security.py` uses PyJWT |
| console.error in API actions | Re-throw only, no logging | Phase 2 (FIX-05) | New action functions must NOT add console.error |

## Open Questions

1. **Backend test coverage for new endpoints**
   - What we know: `backend/tests/test_auth.py` has minimal integration tests (register + login only). Tests use httpx against a live API.
   - What's unclear: Whether the test pattern expects tests for every new endpoint or just critical paths.
   - Recommendation: Add integration tests for both new endpoints. The existing conftest.py pattern with `httpx.AsyncClient` is straightforward.

2. **Same-email update-email edge case**
   - What we know: User could submit update-email with their current email as the "new" email.
   - What's unclear: Whether this should be rejected or silently succeed.
   - Recommendation: Allow it (no-op effectively) -- the uniqueness check passes since it matches the current user. No special handling needed unless the planner wants to add a check.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (backend); no frontend test framework configured |
| Config file | `backend/tests/conftest.py` |
| Quick run command | `cd backend && python -m pytest tests/test_auth.py -x` |
| Full suite command | `cd backend && python -m pytest tests/ -x` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETT-01 | Update display name via PATCH /auth/update-name | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "update_name"` | Wave 0 |
| SETT-02 | Update email via PATCH /auth/update-email | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "update_email"` | Wave 0 |
| SETT-03 | Change password via existing endpoint | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "change_password"` | Wave 0 |
| SETT-04 | Delete account via existing endpoint | integration | `cd backend && python -m pytest tests/test_auth.py -x -k "delete_account"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && python -m pytest tests/test_auth.py -x`
- **Per wave merge:** `cd backend && python -m pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/test_auth.py` -- needs test functions for `update_name`, `update_email`, `change_password`, `delete_account` (only register+login exist currently)
- [ ] Frontend has no test framework configured -- all frontend testing is manual/visual

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all referenced files in CONTEXT.md canonical refs
- `backend/src/routers/auth.py` -- existing endpoint patterns (change-password, delete-account)
- `backend/src/schemas/auth.py` -- existing Pydantic schema patterns
- `backend/src/api/deps.py` -- Redis cache behavior, password_hash exclusion from cache
- `frontend/components/AddSubDialog.tsx` -- dialog + form + toast pattern
- `frontend/lib/api/auth.actions.ts` -- existing action function patterns
- `frontend/hooks/useGetUser.ts` -- refresh mechanism
- `frontend/components/ui/tabs.tsx` -- Radix tabs primitive already installed
- `.planning/phases/03-settings-account-management/03-UI-SPEC.md` -- complete design specification

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONVENTIONS.md` -- coding style rules verified against actual code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in package.json / existing code
- Architecture: HIGH -- all patterns directly observed in codebase (AddSubDialog, auth.py endpoints, deps.py cache handling)
- Pitfalls: HIGH -- identified from direct code inspection (missing frontend actions, cache invalidation, password_hash exclusion from Redis, email uniqueness)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable -- no fast-moving dependencies)
