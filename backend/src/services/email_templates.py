from __future__ import annotations
import html
from datetime import date

def renewal_subject(title: str, renewal_date: date) -> str:
    return f"Renewal reminder: {html.escape(title)} ({renewal_date.isoformat()})"

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
