# Phase 3: Settings — Account Management - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a full Settings page with a tabbed layout. Phase 3 delivers the Account tab (name update, email update, password change, account deletion). The Notifications and Appearance tabs are scaffolded now but show "Coming soon" until Phases 4 and 5 fill them. The current `frontend/app/(i)/settings/page.tsx` stub is fully replaced.

Requirements in scope: SETT-01, SETT-02, SETT-03, SETT-04

</domain>

<decisions>
## Implementation Decisions

### Settings Page Layout

- **D-01:** Build the full tabbed settings layout in Phase 3 — three tabs: Account (active), Notifications (coming soon), Appearance (coming soon). No refactor needed in Phases 4/5 — they just fill their tab.
- **D-02:** Use the existing `tabs` shadcn/ui component (`frontend/components/ui/tabs.tsx`) for the tab container.
- **D-03:** Notifications and Appearance tabs show a `"Coming soon"` placeholder (same style as the current stub card — `rounded-2xl bg-[#231b2e] border border-[#342a45] p-6 text-[#ab9db9] text-sm`). They are NOT disabled/grayed-out — they are clickable but show placeholder content.

### Account Tab — Display Name (SETT-01)

- **D-04:** Show the current display name as read-only text with an Edit button. Clicking Edit opens a dialog with a prefilled input for the new name. Submit calls the new `PATCH /auth/update-name` endpoint. Dialog closes on success.
- **D-05:** Success feedback: Sonner toast (`"Display name updated"`). The displayed name refreshes immediately (call `useGetUser().refresh()` or update local state).
- **D-06:** Backend needs a new `PATCH /auth/update-name` endpoint. Payload: `{ name: string }`. Response: `{ detail: string }`. Must invalidate the user Redis cache key (`user:{user_id}`).

### Account Tab — Email Address (SETT-02)

- **D-07:** Show current email as read-only text with an Edit button. Clicking opens a dialog with two fields: new email and current password. Submit calls the new `PATCH /auth/update-email` endpoint.
- **D-08:** Backend needs a new `PATCH /auth/update-email` endpoint. Payload: `{ new_email: string, password: string }`. Verifies current password before updating. Must invalidate user Redis cache key. Returns `{ detail: string }`.
- **D-09:** After successful email change: user stays logged in (session token uses user ID, not email). Show Sonner toast `"Email updated"`. Refresh displayed email.

### Account Tab — Change Password (SETT-03)

- **D-10:** A "Change Password" button in the Account section opens a dialog with three fields: current password, new password, confirm new password. Frontend validates new password === confirm. Submit calls the existing `POST /auth/change-password` endpoint (already implemented).
- **D-11:** Success feedback: Sonner toast `"Password changed"`. Dialog closes. No logout.

### Account Tab — Delete Account (SETT-04)

- **D-12:** A "Danger Zone" section (visually separated, red-accented border or heading) contains a "Delete Account" button.
- **D-13:** Clicking opens a dialog explaining the action is permanent and irreversible. The user must type `DELETE` in a text input before the confirm button becomes active (enabled only when input value === "DELETE"). This is the type-to-confirm pattern.
- **D-14:** Submit calls the existing `DELETE /auth/delete-account` endpoint. On success: clear session (call `POST /auth/logout` or rely on the backend clearing the cookie), then redirect to `/sign-in`.

### Post-Action Feedback (All Operations)

- **D-15:** All success states use Sonner toast (already used in the app). Error states show toast with `variant="error"` or an inline error message beneath the relevant field inside the dialog.

### Claude's Discretion

- Component file structure: Claude can decide whether to put all settings dialogs in one file (e.g., `AccountSettings.tsx`) or split them into individual dialog components. One file is acceptable given the small number.
- Form library: Use react-hook-form (already used in AuthForm and AddSubDialog) for dialog forms. Or plain controlled inputs — Claude's choice.
- Whether to add a `name` update to the backend `UserMe` response schema or leave it as-is — Claude can adjust schemas as needed.
- Exact layout of the Account tab (spacing, section groupings) — follow the app's established dark-purple palette.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing backend endpoints (already implemented — no changes needed)
- `backend/src/routers/auth.py` — Contains `POST /auth/change-password` (D-10/D-11) and `DELETE /auth/delete-account` (D-14). Read before planning backend tasks to avoid duplication.
- `backend/src/schemas/auth.py` — Existing Pydantic schemas including `ChangePassword`, `UserMe`. New schemas for update-name and update-email go here.
- `backend/src/api/deps.py` — `get_current_user` dependency; used on all protected endpoints.

### Frontend patterns to follow
- `frontend/app/(i)/settings/page.tsx` — Current stub; will be fully replaced.
- `frontend/components/ui/tabs.tsx` — Tab container component to use for the settings layout.
- `frontend/components/ui/SectionCard.tsx` — Card wrapper used throughout the app.
- `frontend/components/ui/dialog.tsx` — Dialog primitive for all edit dialogs.
- `frontend/components/AddSubDialog.tsx` — Reference for dialog + form pattern in this codebase.
- `frontend/hooks/useGetUser.ts` — `useGetUser()` hook; call `.refresh()` after name/email updates to sync displayed values.
- `frontend/lib/api/base.actions.ts` — `apiFetch<T>()` — all frontend HTTP calls go through here.
- `frontend/lib/api/auth.actions.ts` — Existing auth action functions; add `updateName()` and `updateEmail()` here.
- `frontend/types/index.d.ts` — Shared TypeScript interfaces; `User` type is here.

### Project state & decisions
- `.planning/STATE.md` — Current project state and key decisions log.
- `.planning/codebase/CONVENTIONS.md` — Code style rules (tabs, no semicolons, no trailing commas, double quotes, etc.) — MANDATORY for any new frontend code.

</canonical_refs>

<specifics>
## Specific Ideas

- The `DELETE /auth/delete-account` endpoint already clears the user's Redis cache and deletes the DB record. The frontend just needs to call `POST /auth/logout` (which clears the cookie) after the delete succeeds, then redirect to `/sign-in`.
- For the type-to-confirm delete pattern: the confirm button's `disabled` prop = `inputValue !== "DELETE"`. No complex logic needed.
- The `PATCH /auth/update-name` and `PATCH /auth/update-email` endpoints are the only two new backend endpoints needed for this phase.
- The `useGetUser` hook already has a `refresh()` function — use it to reload name/email after an update so the header/sidebar also reflect the change if they display the user name.
- Danger Zone section: use a red border/text accent to visually signal destructiveness. The color palette uses `text-red-500` / `border-red-500` in Tailwind.

</specifics>

<deferred>
## Deferred Ideas

- Email verification flow (send a verification link to the new email before updating) — not in scope. Direct update with password confirmation is sufficient.
- "Force logout all devices" on password change — not in scope.
- Avatar/profile photo upload — not in scope (no requirement).
- Account suspension / soft delete — not in scope.

</deferred>

---

*Phase: 03-settings-account-management*
*Context gathered: 2026-04-02 via discuss-phase*
