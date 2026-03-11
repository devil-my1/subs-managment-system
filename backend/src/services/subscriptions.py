from __future__ import annotations
from datetime import datetime, timezone, time, date
from zoneinfo import ZoneInfo
from dateutil.relativedelta import relativedelta
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.subscription import Subscription, BillingPeriod, SubscriptionStatus
from src.models.payment import SubscriptionPayment
from src.models.reminder import Reminder

JST = ZoneInfo("Asia/Tokyo")


def _advance_date(d, period: BillingPeriod):
    if d is None:
        return None
    if period == BillingPeriod.monthly:
        return d + relativedelta(months=+1)
    return d + relativedelta(years=+1)


async def advance_due_renewals(db: AsyncSession, *, today: date | None = None):
    """
    Advance subscriptions whose next_renewal_date is today (or earlier) by one billing period.
    Only applies to active, auto-renew subscriptions with a next_renewal_date set.
    Returns (processed_count, affected_user_ids).
    """
    today = today or date.today()

    res = await db.execute(
        select(Subscription)
        .where(
            Subscription.next_renewal_date != None,  # noqa: E711
            Subscription.next_renewal_date <= today,
            Subscription.auto_renew.is_(True),
            Subscription.status == SubscriptionStatus.active,
        )
    )

    subs = res.scalars().all()
    processed = 0
    affected_users: set[str] = set()

    for sub in subs:
        db.add(SubscriptionPayment(
            user_id=sub.user_id,
            subscription_id=sub.id,
            paid_at=today,
            amount=float(sub.amount),
            currency=sub.currency,
            note="Auto renewal",
        ))
        sub.next_renewal_date = _advance_date(
            sub.next_renewal_date, sub.billing_period)
        affected_users.add(str(sub.user_id))
        processed += 1
        await regenerate_email_reminder(db, sub)

    return processed, affected_users


async def regenerate_email_reminder(db: AsyncSession, sub: Subscription, *, hour_jst: int = 9, minute_jst: int = 0) -> None:
    """
    Create a single email reminder for next_renewal_date.
    Schedules at hour_jst:minute_jst in JST, then converts to UTC for storage.
    Idempotent via UNIQUE(subscription_id, channel, scheduled_for).
    """
    if not sub.next_renewal_date:
        return

    days = sub.reminder_days_before or 0
    scheduled_date = sub.next_renewal_date - relativedelta(days=+days)

    scheduled_jst = datetime.combine(
        scheduled_date, time(hour_jst, minute_jst), tzinfo=JST)
    scheduled_utc = scheduled_jst.astimezone(timezone.utc)

    # If already in the past, schedule for 1 minute from now (UTC) so you still get it
    now_utc = datetime.now(timezone.utc)
    if scheduled_utc <= now_utc:
        scheduled_utc = now_utc.replace(
            second=0, microsecond=0) + relativedelta(minutes=+1)

    # Reuse an existing pending/canceled reminder to honor the unique constraint and avoid duplicates
    existing = await db.execute(
        select(Reminder)
        .where(
            Reminder.subscription_id == sub.id,
            Reminder.channel == "email",
            Reminder.status.in_(["pending", "canceled"]),
        )
        .order_by(Reminder.created_at.desc())
    )
    reminder = existing.scalars().first()

    if reminder:
        reminder.scheduled_for = scheduled_utc
        reminder.status = "pending"
        reminder.sent_at = None
        reminder.last_error = None
    else:
        db.add(Reminder(
            user_id=sub.user_id,
            subscription_id=sub.id,
            channel="email",
            scheduled_for=scheduled_utc,
            status="pending",
        ))


async def renew_subscription(
    db: AsyncSession,
    sub: Subscription,
    *,
    paid_at,
    amount,
    currency,
    note,
    advance: bool,
) -> Subscription:
    # Payment record (truth source)
    db.add(SubscriptionPayment(
        user_id=sub.user_id,
        subscription_id=sub.id,
        paid_at=paid_at,
        amount=amount,
        currency=currency,
        note=note,
    ))

    # Advance next renewal only when it makes sense
    if advance and sub.status == SubscriptionStatus.active:
        if sub.auto_renew and sub.next_renewal_date is not None:
            sub.next_renewal_date = _advance_date(
                sub.next_renewal_date, sub.billing_period)

    # If end_date is in the past, auto-expire
    if sub.end_date and sub.end_date < paid_at:
        sub.status = SubscriptionStatus.expired

    # Cancel old pending reminders for this subscription (email only for now)
    await db.execute(
        update(Reminder)
        .where(Reminder.subscription_id == sub.id, Reminder.status == "pending", Reminder.channel == "email")
        .values(status="canceled")
    )

    await regenerate_email_reminder(db, sub)
    return sub
