---
phase: 01-security-hardening
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/services/email_templates.py
  - backend/src/routers/jobs.py
autonomous: true
requirements: [SEC-05, SEC-06]

must_haves:
  truths:
    - "A subscription with title '<script>alert(1)</script>' produces a reminder email containing '&lt;script&gt;alert(1)&lt;/script&gt;' — not raw HTML tags"
    - "A subscription URL containing '<img src=x onerror=alert(1)>' is escaped before being placed inside the anchor href attribute"
    - "The renewal_subject() function also escapes the title (used in email subject line)"
    - "When resend.Emails.send() raises an exception, reminder.last_error contains only str(e)[:500] — no email body content"
    - "jobs.py line 80-81 no longer references email.body in the error handler"
  artifacts:
    - path: "backend/src/services/email_templates.py"
      provides: "HTML email template with html.escape() applied to all user-supplied fields"
      contains: "html.escape"
    - path: "backend/src/routers/jobs.py"
      provides: "Fixed last_error assignment — no email.body concatenation"
  key_links:
    - from: "backend/src/services/email_templates.py"
      to: "html.escape()"
      via: "import html"
      pattern: "html\\.escape"
    - from: "backend/src/routers/jobs.py"
      to: "reminder.last_error"
      via: "str(e)[:500] only"
      pattern: "last_error = str\\(e\\)\\[:500\\]$"
---

<objective>
Fix two low-complexity security bugs that are isolated to two backend files: apply html.escape() to all user-supplied fields in email templates (SEC-05) and remove the email body concatenation from the last_error assignment in jobs.py (SEC-06).

Purpose: Prevents stored XSS via email templates and stops sensitive email body content from being persisted in the database's last_error column on send failure. This plan is Wave 1 — fully independent, touches no shared dependencies, can execute in parallel with Plan 1.
Output: email_templates.py with HTML-escaped user fields; jobs.py with clean last_error assignment.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-security-hardening/01-CONTEXT.md
@.planning/codebase/CONCERNS.md

<interfaces>
<!-- From backend/src/services/email_templates.py (current) -->
```python
def renewal_subject(title: str, renewal_date: date) -> str:
    return f"Renewal reminder: {title} ({renewal_date.isoformat()})"

def renewal_html(*, title: str, renewal_date: date, amount: str, url: str | None, days_left: int) -> str:
    link_html = f'<p><a href="{url}">Open subscription link</a></p>' if url else ""
    return f"""
    <div ...>
      <h2>Renewal reminder</h2>
      <p><b>{title}</b> renews on <b>{renewal_date.isoformat()}</b> ({days_left} day(s) left).</p>
      <p>Amount: <b>{amount}</b></p>
      {link_html}
      ...
    </div>
    """
```

<!-- From backend/src/routers/jobs.py line 78-81 (current — the bug) -->
```python
except Exception as e:
    reminder.status = "failed"
    reminder.last_error = str(e)[:500] + email.body if 'email' in locals() else str(e)[:500]
    failed += 1
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Apply html.escape() to all user-supplied fields in email_templates.py</name>
  <files>backend/src/services/email_templates.py</files>
  <behavior>
    - renewal_html(title="<script>alert(1)</script>", ...) returns HTML containing "&lt;script&gt;alert(1)&lt;/script&gt;" not raw script tags
    - renewal_html(title="Normal Title", ...) returns HTML containing "Normal Title" unchanged (no double-encoding)
    - renewal_html(url="https://example.com", ...) places the URL in the href attribute with html.escape() applied
    - renewal_html(url='"><img src=x onerror=alert(1)>', ...) escapes the URL so it cannot break out of the href attribute
    - renewal_html(url=None, ...) returns HTML with no anchor tag (url=None case unchanged)
    - renewal_subject(title="<b>Netflix</b>", ...) returns a subject line with escaped title: "&lt;b&gt;Netflix&lt;/b&gt;"
    - amount is NOT escaped — it is a server-generated string like "12.99 USD", not user-supplied; leave as-is
    - renewal_date.isoformat() is NOT escaped — it is a date object, not user-supplied; leave as-is
  </behavior>
  <action>
Modify backend/src/services/email_templates.py:

1. Add at the top: `import html`

2. In `renewal_subject()`: escape `title` before interpolation:
   ```python
   def renewal_subject(title: str, renewal_date: date) -> str:
       return f"Renewal reminder: {html.escape(title)} ({renewal_date.isoformat()})"
   ```

3. In `renewal_html()`: escape `title` and `url` before use:
   ```python
   def renewal_html(*, title: str, renewal_date: date, amount: str, url: str | None, days_left: int) -> str:
       safe_title = html.escape(title)
       safe_url = html.escape(url) if url else None
       link_html = f'<p><a href="{safe_url}">Open subscription link</a></p>' if safe_url else ""
       return f"""
       <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
         <h2>Renewal reminder</h2>
         <p><b>{safe_title}</b> renews on <b>{renewal_date.isoformat()}</b> ({days_left} day(s) left).</p>
         <p>Amount: <b>{amount}</b></p>
         {link_html}
         <hr/>
         <p style="color:#666;">Sent by your Subscriptions Manager.</p>
       </div>
       """
   ```

Fields to escape (user-supplied, per D-15):
- `title`: the subscription name the user entered
- `url`: the subscription URL the user entered (also in href — must escape to prevent attribute injection)

Fields NOT to escape (server-generated):
- `amount`: formatted by the jobs router as f"{float(sub.amount):.2f} {sub.currency}" — server-controlled
- `renewal_date.isoformat()`: a Python date object formatted server-side
- `days_left`: an integer

The function signatures must remain identical — no changes to parameter names or types.
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system/backend && python -c "
from src.services.email_templates import renewal_html, renewal_subject
from datetime import date

# XSS in title
html_out = renewal_html(title='<script>alert(1)</script>', renewal_date=date(2026,4,1), amount='9.99 USD', url=None, days_left=3)
assert '<script>' not in html_out, 'script tag not escaped in title'
assert '&lt;script&gt;' in html_out, 'title not html-escaped'

# XSS in URL
html_out2 = renewal_html(title='Test', renewal_date=date(2026,4,1), amount='9.99 USD', url='http://x.com/&quot;><img src=x>', days_left=3)
assert '<img' not in html_out2, 'img tag not escaped in url'

# Normal title unchanged
html_out3 = renewal_html(title='Netflix', renewal_date=date(2026,4,1), amount='9.99 USD', url=None, days_left=5)
assert 'Netflix' in html_out3

# Subject escape
subj = renewal_subject('<b>Netflix</b>', date(2026,4,1))
assert '<b>' not in subj and '&lt;b&gt;' in subj

print('ALL EMAIL TEMPLATE XSS CHECKS PASSED')
"</automated>
  </verify>
  <done>
- email_templates.py imports html
- renewal_subject escapes title
- renewal_html uses html.escape(title) and html.escape(url) before interpolation
- All five behavioral tests pass
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix last_error bug in jobs.py — remove email.body concatenation</name>
  <files>backend/src/routers/jobs.py</files>
  <action>
Modify backend/src/routers/jobs.py, lines 78-82 (the except block inside the per-reminder loop):

Current buggy code:
```python
except Exception as e:
    reminder.status = "failed"
    reminder.last_error = str(e)[:500] + email.body if 'email' in locals() else str(e)[:500]
    failed += 1
```

Fix — replace with:
```python
except Exception as e:
    reminder.status = "failed"
    reminder.last_error = str(e)[:500]
    failed += 1
```

This is a one-line change. Remove the ternary expression entirely. The ternary was checking if `email` was defined in locals() to avoid a NameError, then appending `email.body` — both the check and the concatenation are removed.

The fix stores only the exception message, truncated to 500 characters. This prevents:
1. Storing full email HTML (which contains user subscription data) in last_error
2. The theoretical case where a successful send followed by a different exception would have stored a mix of error + email body

Do NOT change anything else in jobs.py — the rest of the send-reminders and advance-renewals endpoints are correct.
  </action>
  <verify>
    <automated>cd e:/Study/ReactApps/my-managment-system/backend && grep -n "email\.body\|last_error" src/routers/jobs.py</automated>
  </verify>
  <done>
- jobs.py line with last_error assignment shows only `str(e)[:500]` — no `email.body` reference
- grep for "email.body" in jobs.py returns no results
  </done>
</task>

</tasks>

<verification>
```bash
cd e:/Study/ReactApps/my-managment-system/backend

# 1. Confirm email.body is gone
grep -n "email\.body" src/routers/jobs.py
# Expected: no output

# 2. Confirm html.escape is present
grep -n "html\.escape\|import html" src/services/email_templates.py
# Expected: two lines minimum (import + at least one usage)

# 3. Run XSS test
python -c "
from src.services.email_templates import renewal_html
from datetime import date
out = renewal_html(title='<script>xss</script>', renewal_date=date.today(), amount='1.00 USD', url='http://x.com', days_left=1)
assert '<script>' not in out
print('XSS check passed')
"
```
</verification>

<success_criteria>
- email_templates.py: `import html` at top; html.escape() applied to title in both functions, html.escape() applied to url before placing in href
- jobs.py: last_error assignment is exactly `str(e)[:500]` — the `+ email.body` suffix and ternary check are gone
- All user-supplied HTML special characters (&lt; &gt; &amp; &quot;) are escaped in both subject and body
</success_criteria>

<output>
After completion, create `.planning/phases/01-security-hardening/01-04-SUMMARY.md` with:
- Files modified: backend/src/services/email_templates.py, backend/src/routers/jobs.py
- What changed: html.escape() applied to title and url in both email template functions; email.body concatenation removed from last_error
- Decisions made: amount and dates not escaped (server-generated, not user-supplied); renewal_subject also escapes title (subject injection vector)
- Verification result: paste output of verification commands
</output>
