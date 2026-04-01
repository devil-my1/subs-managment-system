"""
Tests for email_templates.py — verifies XSS prevention via html.escape().
RED phase: these tests should FAIL before the fix is applied.
"""
from datetime import date
import pytest

from src.services.email_templates import renewal_html, renewal_subject


class TestRenewalHtml:
    def test_title_xss_is_escaped(self):
        """Script tag in title must be HTML-escaped, not rendered raw."""
        html_out = renewal_html(
            title="<script>alert(1)</script>",
            renewal_date=date(2026, 4, 1),
            amount="9.99 USD",
            url=None,
            days_left=3,
        )
        assert "<script>" not in html_out, "Raw <script> tag found in output — XSS vulnerability"
        assert "&lt;script&gt;" in html_out, "Escaped &lt;script&gt; not found — html.escape() not applied"

    def test_url_xss_is_escaped(self):
        """Malicious URL must not be able to break out of href attribute."""
        html_out = renewal_html(
            title="Test",
            renewal_date=date(2026, 4, 1),
            amount="9.99 USD",
            url='http://x.com/"><img src=x onerror=alert(1)>',
            days_left=3,
        )
        assert "<img" not in html_out, "Raw <img> tag found in output — URL XSS vulnerability"

    def test_normal_title_unchanged(self):
        """Normal ASCII title should appear unchanged in output."""
        html_out = renewal_html(
            title="Netflix",
            renewal_date=date(2026, 4, 1),
            amount="9.99 USD",
            url=None,
            days_left=5,
        )
        assert "Netflix" in html_out, "Normal title not found in output"

    def test_url_none_no_anchor_tag(self):
        """url=None should produce output with no anchor tag."""
        html_out = renewal_html(
            title="Netflix",
            renewal_date=date(2026, 4, 1),
            amount="9.99 USD",
            url=None,
            days_left=5,
        )
        assert "<a " not in html_out, "Anchor tag found when url=None"

    def test_url_valid_produces_anchor(self):
        """A valid URL should produce an anchor tag in output."""
        html_out = renewal_html(
            title="Netflix",
            renewal_date=date(2026, 4, 1),
            amount="9.99 USD",
            url="https://netflix.com",
            days_left=5,
        )
        assert "<a " in html_out, "Anchor tag not found for valid URL"
        assert "https://netflix.com" in html_out, "URL not present in output"

    def test_amount_not_double_encoded(self):
        """Server-generated amount string should appear as-is."""
        html_out = renewal_html(
            title="Netflix",
            renewal_date=date(2026, 4, 1),
            amount="9.99 USD",
            url=None,
            days_left=5,
        )
        assert "9.99 USD" in html_out, "Amount not found in output"

    def test_ampersand_in_title_escaped(self):
        """Ampersand in title should be escaped to &amp;."""
        html_out = renewal_html(
            title="Tom & Jerry",
            renewal_date=date(2026, 4, 1),
            amount="5.00 USD",
            url=None,
            days_left=2,
        )
        assert "Tom &amp; Jerry" in html_out, "Ampersand not escaped in title"
        assert "Tom & Jerry" not in html_out, "Raw ampersand found in title — not escaped"


class TestRenewalSubject:
    def test_subject_title_xss_is_escaped(self):
        """HTML tags in subject title must be escaped."""
        subj = renewal_subject("<b>Netflix</b>", date(2026, 4, 1))
        assert "<b>" not in subj, "Raw <b> tag found in subject — XSS vulnerability"
        assert "&lt;b&gt;" in subj, "Escaped &lt;b&gt; not found in subject"

    def test_subject_normal_title_unchanged(self):
        """Normal ASCII title in subject should appear unchanged."""
        subj = renewal_subject("Netflix", date(2026, 4, 1))
        assert "Netflix" in subj, "Normal title not found in subject"

    def test_subject_contains_date(self):
        """Subject should contain the ISO date string."""
        subj = renewal_subject("Netflix", date(2026, 4, 1))
        assert "2026-04-01" in subj, "Date not found in subject"
