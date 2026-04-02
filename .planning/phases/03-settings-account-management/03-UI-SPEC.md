---
status: draft
phase: "03"
phase_name: Settings — Account Management
design_system: shadcn (new-york style, Tailwind v4, CSS variables)
created: 2026-04-02
revised: 2026-04-02
---

# UI Design Contract: Phase 03 — Settings Account Management

## 1. Design System

- **Tool:** shadcn/ui (new-york style)
- **Icon library:** Lucide React
- **CSS framework:** Tailwind CSS v4 with `@theme inline` custom properties
- **Form library:** react-hook-form + zod (existing pattern from `AddSubDialog.tsx`)
- **Toast library:** Sonner (existing in `components/ui/sonner.tsx`)
- **Preset source:** `frontend/components.json` — base color `neutral`, CSS variables enabled, RSC true

### Components Already Available (no install needed)

| Component | Path | Usage in this phase |
|-----------|------|---------------------|
| `Tabs` | `components/ui/tabs.tsx` | Settings tab container (D-02) |
| `Dialog` | `components/ui/dialog.tsx` | Edit name, edit email, change password, delete account dialogs |
| `Button` | `components/ui/button.tsx` | Edit triggers, submit/dismiss, delete account |
| `Input` | `components/ui/input.tsx` | Name, email, password fields inside dialogs |
| `Form` | `components/ui/form.tsx` | Form wrapper with react-hook-form integration |
| `Label` | `components/ui/label.tsx` | Field labels inside dialogs |
| `SectionCard` | `components/ui/SectionCard.tsx` | Card wrapper for each settings section |
| `Separator` | `components/ui/separator.tsx` | Visual divider above Danger Zone |

### Components NOT Needed

No new shadcn components need to be installed. No third-party registries.

### Registry

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | 0 new installs | N/A — all components already installed |
| Third-party | none | N/A |

---

## 2. Spacing

Scale: 8-point grid (multiples of 4px).

| Token | Value | Usage |
|-------|-------|-------|
| `gap-2` | 8px | Between tab triggers; between label and field |
| `gap-4` | 16px | Between form fields inside dialogs |
| `gap-6` | 24px | Between settings sections within the Account tab |
| `p-6` | 24px | SectionCard internal padding |
| `p-6 py-8` | 24px/32px | Dialog content padding (matches existing `.shad-dialog` pattern) |
| `mt-8` | 32px | Danger Zone top margin (visual separation) |
| `px-4 sm:px-6 md:px-8` | 16/24/32px | Page horizontal padding (matches Shell container breakpoints) |

**Exceptions:** None. All values are multiples of 4.

---

## 3. Typography

Inherits from `globals.css` typography classes. This phase uses exactly these:

| Role | Class | Size | Weight | Line-height | Usage |
|------|-------|------|--------|-------------|-------|
| Page heading | `h2` | 24px | 600 (semibold) | 36px (1.5) | "Settings" page title |
| Section heading | `h5` | 16px | 600 (semibold) | 24px (1.5) | "Profile", "Security", "Danger Zone" section titles |
| Body | `body-2` | 14px | 400 (normal) | 20px (1.43) | Field values, descriptions, placeholder text |
| Caption | `caption` | 12px | 400 (normal) | 16px (1.33) | Helper text beneath fields, "Coming soon" placeholder |

**Font sizes used:** 4 total — 12px, 14px, 16px, 24px.

**Font weights used:** 2 total — 400 (normal) and 600 (semibold).

**Dialog titles:** `text-2xl font-semibold text-foreground` (24px, 600) — same size as the page heading, applied via inline classes rather than the `h2` global style.

---

## 4. Color

All colors reference existing CSS custom properties from `globals.css`.

### 60/30/10 Split

| Role | Token | Hex | Elements |
|------|-------|-----|----------|
| 60% Dominant | `--color-bg` | `#191022` | Page background |
| 30% Secondary | `--color-surface` / `bg-surface-dark` | `#231b2e` | SectionCards, tab content area, dialog background |
| 10% Accent | `--color-primary` | `#7f13ec` | Active tab indicator, primary submit buttons, Edit button hover |

### Semantic Colors

| Token | Hex | Reserved For |
|-------|-----|-------------|
| `--color-primary` | `#7f13ec` | Primary CTA buttons (Save Name, Update Email) |
| `--color-primary-hover` | `#680ec3` | Primary button hover state |
| `text-red-500` | `#ef4444` | Danger Zone border, Delete Account button text, destructive toast |
| `border-red-500/30` | `#ef4444` at 30% | Danger Zone card border |
| `bg-red-950/50` | dark red | Delete Account button background on hover |
| `--color-text` | `#e8e1f2` | Primary body text |
| `--color-text-muted` / `text-[#ab9db9]` | `#ab9db9` | Labels, descriptions, secondary text |
| `--color-text-strong` | `#ffffff` | Page heading, dialog titles |
| `--color-border` | `#342a45` | Card borders, input borders, separator |
| `--color-success` | `#0bda73` | Success toast icon (handled by Sonner) |

### Accent Reserved-For List

The `--color-primary` (`#7f13ec`) accent is reserved ONLY for:
1. Active tab trigger background
2. Primary action buttons ("Save Name", "Update Email", "Change Password")
3. Focus ring on form inputs (`focus-within:border-primary-500`)

Red accent (`text-red-500`, `border-red-500`) is reserved ONLY for:
1. Danger Zone section border
2. "Delete Account" button
3. Delete confirmation dialog's confirm button (when enabled)

---

## 5. Layout

### Visual Focal Point

Primary focal point: the "Settings" page heading (24px semibold) and the active Account tab trigger draw the eye first. The Profile section card is the dominant content block, anchoring the user's attention to their identity fields (name and email) as the starting interaction point.

### Page Structure

```
Shell
  +-- Page Header: "Settings" (h2, font-semibold) + subtitle "Manage your account"
  +-- Tabs (defaultValue="account")
        +-- TabsList
        |     +-- TabsTrigger "Account"
        |     +-- TabsTrigger "Notifications"
        |     +-- TabsTrigger "Appearance"
        +-- TabsContent "account"
        |     +-- AccountTab component
        +-- TabsContent "notifications"
        |     +-- Coming Soon placeholder card
        +-- TabsContent "appearance"
              +-- Coming Soon placeholder card
```

### Account Tab Layout

```
AccountTab
  +-- SectionCard "Profile" (p-6, gap-6)
  |     +-- Row: Display Name — current value (text) + "Edit" button (ghost)
  |     +-- Row: Email — current value (text) + "Edit" button (ghost)
  +-- SectionCard "Security" (p-6, gap-6, mt-6)
  |     +-- Row: Password — masked "********" + "Change Password" button (ghost)
  +-- SectionCard "Danger Zone" (p-6, mt-8, border-red-500/30)
        +-- Description text: "Permanently delete your account..."
        +-- "Delete Account" button (destructive variant)
```

### Row Pattern (Read-Only Value + Edit Button)

Each row inside a SectionCard follows this pattern:
- Left side: Label (`text-[#ab9db9] text-sm`) above Value (`text-white text-base`)
- Right side: Button (variant `ghost`, size `sm`, text `"Edit"` or `"Change Password"`)
- Layout: `flex items-center justify-between`
- Vertical spacing between rows: `gap-4` (16px)
- Divider between rows: `Separator` component with `bg-border` color

### Tab Styling Overrides

The default shadcn `TabsList` needs dark theme overrides:
- `TabsList`: `bg-surface-2 rounded-lg p-1 w-full sm:w-auto`
- `TabsTrigger`: active state uses `data-[state=active]:bg-primary data-[state=active]:text-white`, inactive uses `text-text-muted`
- All three tabs are clickable; Notifications and Appearance show placeholder content

### Coming Soon Placeholder

```
<SectionCard className="p-6">
  <p className="text-[#ab9db9] text-sm">Coming soon.</p>
</SectionCard>
```

Matches existing stub style from `settings/page.tsx` (D-03).

### Dialog Dimensions

All dialogs use the existing `.shad-dialog`-derived styling:
- `w-[90%] max-w-[400px]` (narrower than AddSubDialog since forms are simpler)
- `bg-surface-dark border border-border-dark rounded-2xl`
- `p-6 py-8`

### Responsive Behavior

- Mobile (<640px): Tabs stack full-width; TabsList becomes `w-full` with equal-width triggers
- Desktop (>=640px): TabsList auto-width, left-aligned
- Dialogs: `w-[calc(100vw-2rem)] sm:max-w-[400px]` — full width on mobile, constrained on desktop

---

## 6. Component Inventory

### New Components to Build

| Component | File | Responsibility |
|-----------|------|---------------|
| `SettingsPage` | `app/(i)/settings/page.tsx` | Replaces existing stub. Renders Shell + Tabs layout. Server component shell, delegates to client AccountTab. |
| `AccountTab` | `components/settings/AccountTab.tsx` | Client component. Renders Profile, Security, Danger Zone sections. Manages dialog open states. Uses `useGetUser()` for current user data. |
| `EditNameDialog` | `components/settings/EditNameDialog.tsx` | Dialog with single `name` input. Calls `updateName()` action. |
| `EditEmailDialog` | `components/settings/EditEmailDialog.tsx` | Dialog with `new_email` + `password` inputs. Calls `updateEmail()` action. |
| `ChangePasswordDialog` | `components/settings/ChangePasswordDialog.tsx` | Dialog with `current_password`, `new_password`, `confirm_password`. Calls existing `changePassword()` action. |
| `DeleteAccountDialog` | `components/settings/DeleteAccountDialog.tsx` | Dialog with type-to-confirm input. Calls `deleteAccount()` then `logout()` then redirect. |

### New API Actions

| Function | File | Endpoint |
|----------|------|----------|
| `updateName(name: string)` | `lib/api/auth.actions.ts` | `PATCH /auth/update-name` |
| `updateEmail(newEmail: string, password: string)` | `lib/api/auth.actions.ts` | `PATCH /auth/update-email` |

### Existing Actions to Reuse

| Function | File | Usage |
|----------|------|-------|
| `changePassword(...)` | `lib/api/auth.actions.ts` | Change password dialog |
| `deleteAccount()` | `lib/api/auth.actions.ts` | Delete account dialog |
| `logout()` | `lib/api/auth.actions.ts` | Post-delete redirect |
| `useGetUser()` | `hooks/useGetUser.ts` | Fetch and refresh current user data |

---

## 7. Interaction States

### Edit Name Dialog

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Ghost "Edit" button next to display name | Opens dialog on click |
| Dialog open | Input prefilled with current name, focus on input. Footer: "Discard Changes" (ghost) + "Save Name" (primary) | Submit enabled when value differs from current |
| Submitting | Button text: "Saving..." + Loader spinner | Input disabled, button disabled |
| Success | Dialog closes, toast: "Display name updated" | `useGetUser().refresh()` called |
| Error | Toast: "Failed to update display name. Please try again." | Dialog stays open, input re-enabled |

### Edit Email Dialog

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Ghost "Edit" button next to email | Opens dialog on click |
| Dialog open | Two fields: New email (empty), Current password (empty). Footer: "Discard Changes" (ghost) + "Update Email" (primary) | Submit enabled when both non-empty |
| Submitting | Button text: "Updating..." + Loader | Inputs disabled |
| Success | Dialog closes, toast: "Email updated" | `useGetUser().refresh()` called |
| Error (wrong password) | Inline error under password field: "Incorrect password" | Dialog stays open |
| Error (email taken) | Inline error under email field: "Email already in use" | Dialog stays open |
| Error (generic) | Toast: "Failed to update email. Please try again." | Dialog stays open |

### Change Password Dialog

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Ghost "Change Password" button in Security section | Opens dialog on click |
| Dialog open | Three fields: Current password, New password, Confirm password. Footer: "Discard Changes" (ghost) + "Change Password" (primary) | Submit enabled when all non-empty and new === confirm |
| Validation error | Inline error: "Passwords do not match" under confirm field | Client-side, instant |
| Submitting | Button text: "Changing..." + Loader | Inputs disabled |
| Success | Dialog closes, toast: "Password changed" | No logout (D-11) |
| Error (wrong current) | Inline error under current password: "Incorrect password" | Dialog stays open |
| Error (generic) | Toast: "Failed to change password. Please try again." | Dialog stays open |

### Delete Account Dialog

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Destructive "Delete Account" button in Danger Zone | Opens dialog on click |
| Dialog open | Warning text + input for typing "DELETE" + disabled confirm button. Footer: "Keep My Account" (ghost) + "Delete My Account" (destructive, disabled) | Confirm enabled only when input === "DELETE" |
| Confirm disabled | Confirm button: `opacity-50 cursor-not-allowed` | Cannot submit |
| Confirm enabled | Confirm button: full opacity, red background | Click triggers deletion |
| Submitting | Button text: "Deleting..." + Loader | Input disabled, button disabled |
| Success | Toast: "Account deleted" then redirect to `/sign-in` | `logout()` called, then `router.push("/sign-in")` |
| Error | Toast: "Failed to delete account. Please try again." | Dialog stays open |

### Tab Switching

| State | Visual |
|-------|--------|
| Active tab | `bg-primary text-white` background on trigger |
| Inactive tab | `text-text-muted` no background |
| Hover (inactive) | `hover:text-white` subtle text brighten |

---

## 8. Copywriting

### Static Text

| Element | Copy |
|---------|------|
| Page heading | `Settings` |
| Page subtitle | `Manage your account` |
| Tab label: Account | `Account` |
| Tab label: Notifications | `Notifications` |
| Tab label: Appearance | `Appearance` |
| Section: Profile | `Profile` |
| Section: Security | `Security` |
| Section: Danger Zone | `Danger Zone` |
| Name label | `Display name` |
| Email label | `Email address` |
| Password label | `Password` |
| Password display | `--------` |
| Coming soon placeholder | `Coming soon.` |

### Dialog Titles

| Dialog | Title |
|--------|-------|
| Edit name | `Update Display Name` |
| Edit email | `Update Email Address` |
| Change password | `Change Password` |
| Delete account | `Delete Account` |

### Primary CTA Labels

| Dialog | CTA Label |
|--------|-----------|
| Edit name | `Save Name` |
| Edit email | `Update Email` |
| Change password | `Change Password` |
| Delete account | `Delete My Account` |

### Dismiss Labels

| Dialog | Dismiss Label | Variant |
|--------|---------------|---------|
| Edit name | `Discard Changes` | ghost |
| Edit email | `Discard Changes` | ghost |
| Change password | `Discard Changes` | ghost |
| Delete account | `Keep My Account` | ghost |

### Toast Messages

| Event | Toast Text | Variant |
|-------|-----------|---------|
| Name updated | `Display name updated` | success |
| Email updated | `Email updated` | success |
| Password changed | `Password changed` | success |
| Account deleted | `Account deleted` | success |
| Name update failed | `Failed to update display name. Please try again.` | error |
| Email update failed | `Failed to update email. Please try again.` | error |
| Password change failed | `Failed to change password. Please try again.` | error |
| Account delete failed | `Failed to delete account. Please try again.` | error |

### Inline Error Messages

| Condition | Message | Location |
|-----------|---------|----------|
| Wrong password (email dialog) | `Incorrect password` | Below password field |
| Wrong password (password dialog) | `Incorrect password` | Below current password field |
| Email already taken | `Email already in use` | Below new email field |
| Passwords don't match | `Passwords do not match` | Below confirm password field |
| Name too short | `Name is required` | Below name field (zod) |
| Invalid email | `Please enter a valid email address` | Below email field (zod) |
| Password too short | `Password must be at least 8 characters` | Below new password field (zod) |

### Destructive Action Confirmation

| Action | Dialog body copy | Confirmation mechanism |
|--------|-----------------|----------------------|
| Delete account | `This action is permanent and cannot be undone. All your subscriptions, categories, and account data will be permanently deleted.` | Type `DELETE` in text input. Confirm button disabled until input === "DELETE". |

### Empty States

No empty states in this phase. The Account tab always shows the current user's data (name, email, password mask). Coming Soon tabs show the placeholder card.

---

## 9. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Tab keyboard navigation | Radix `Tabs` primitive handles Arrow Left/Right between triggers, Enter/Space to activate |
| Dialog focus trap | Radix `Dialog` primitive handles focus trap and Escape to close |
| Form labels | Every input has an associated `<Label>` via `FormLabel` or `htmlFor` |
| Error announcements | `FormMessage` uses `aria-live="polite"` (built into shadcn Form) |
| Destructive button | Delete Account button uses `variant="destructive"` which applies `aria-invalid` styling |
| Color contrast | `#ab9db9` muted text on `#231b2e` surface = 4.7:1 ratio (passes AA) |
| Type-to-confirm | Input has `aria-label="Type DELETE to confirm"` |
| Button loading | Disabled state during submission prevents double-submit; loading spinner + text change communicates state |

---

## 10. Validation Rules

### Edit Name Form

```
name: z.string().min(1, "Name is required").max(100)
```

### Edit Email Form

```
new_email: z.string().email("Please enter a valid email address")
password: z.string().min(1, "Password is required")
```

### Change Password Form

```
current_password: z.string().min(1, "Current password is required")
new_password: z.string().min(8, "Password must be at least 8 characters")
confirm_password: z.string().min(1, "Please confirm your password")
```

Plus cross-field: `confirm_password` must equal `new_password` via `.refine()`.

### Delete Account Form

```
confirmation: z.literal("DELETE", { errorMap: () => ({ message: "Type DELETE to confirm" }) })
```

---

*UI-SPEC created: 2026-04-02*
*UI-SPEC revised: 2026-04-02 — fixed typography (4 sizes, 2 weights), spacing (removed px-5), copywriting (Save Name), focal point*
*UI-SPEC revised: 2026-04-02 — replaced generic "Cancel" dismiss labels with context-specific labels per dialog*
*Source: CONTEXT.md decisions (D-01 through D-15), globals.css tokens, existing component patterns*
