# Phase 3: Settings — Account Management — Discussion Log

**Date:** 2026-04-02
**Mode:** discuss-phase (interactive)

---

## Q&A Transcript

### Gray Areas Selected
User selected all 4 presented areas:
- Settings page structure
- Edit UX for name & email
- Email change security
- Delete account confirmation

---

### Area 1: Settings page structure

**Q:** Should Phase 3 build the full tabbed settings layout (Account + empty stubs) or a flat account-only page?
**A:** Full tabs now — Account active, stubs for the rest

**Q:** What should Notifications and Appearance tabs show in Phase 3?
**A:** Coming soon placeholder

---

### Area 2: Edit UX for name & email

**Q:** How should users edit their display name and email?
**A:** Edit dialogs (consistent with AddSubDialog and AddCategoryDialog patterns)

**Q:** What feedback after a successful save?
**A:** Toast notification (Sonner, already used in the app)

**Q:** How should Change Password UI be presented?
**A:** Change Password dialog (3 fields: current + new + confirm)

---

### Area 3: Email change security

**Q:** Should email update require current password?
**A:** Require current password (new email + password in the dialog)

**Q:** After successful email change, log out or stay logged in?
**A:** Stay logged in (session token uses user ID, not email)

---

### Area 4: Delete account confirmation

**Q:** What confirmation mechanism for Delete Account?
**A:** Type DELETE to confirm (confirm button disabled until input === "DELETE")

**Q:** After account deletion, where does the user land?
**A:** Sign-in page

---

*Log generated: 2026-04-02*
