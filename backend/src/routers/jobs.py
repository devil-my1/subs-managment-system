from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, date

from src.core.config import settings
from src.db.session import get_db
from src.models.reminder import Reminder
from src.models.subscription import Subscription
from src.models.user import User
from src.services.email_templates import renewal_subject, renewal_html
from src.services.subscriptions import advance_due_renewals
from src.utils.cache import cache_delete_prefix
import resend

router = APIRouter(prefix="/jobs", tags=["jobs"])

GENERIC_ERROR = "Something went wrong. Please try again later."


@router.post("/send-reminders")
async def send_reminders(
    x_internal_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if x_internal_token != settings.INTERNAL_JOB_TOKEN:
        raise HTTPException(403, "Forbidden")

    try:
        now = datetime.now(timezone.utc)

        res = await db.execute(
            select(Reminder, Subscription, User)
            .join(Subscription, Subscription.id == Reminder.subscription_id)
            .join(User, User.id == Reminder.user_id)
            .where(Reminder.status == "pending", Reminder.scheduled_for <= now, Reminder.channel == "email")
            .order_by(Reminder.scheduled_for.asc())
            .limit(50)
        )
        rows = res.all()

        resend.api_key = settings.RESEND_API_KEY

        processed = 0
        sent = 0
        failed = 0

        for reminder, sub, user in rows:
            processed += 1
            try:
                if not sub.next_renewal_date:
                    # Nothing to remind for; cancel it.
                    reminder.status = "canceled"
                    continue

                days_left = (sub.next_renewal_date - date.today()).days
                amount_str = f"{float(sub.amount):.2f} {sub.currency}"

                params: resend.Emails.SendParams = {
                    "from": settings.EMAIL_FROM,
                    "to": settings.EMAIL_TO_OVERRIDE or user.email,
                    "subject": renewal_subject(sub.title, sub.next_renewal_date),
                    "html": renewal_html(
                        title=sub.title,
                        renewal_date=sub.next_renewal_date,
                        amount=amount_str,
                        url=sub.url,
                        days_left=days_left,
                    ),
                }

                email: resend.Emails.SendResponse = resend.Emails.send(params)

                reminder.status = "sent"
                reminder.sent_at = now
                reminder.last_error = None
                sent += 1
            except Exception as e:
                reminder.status = "failed"
                reminder.last_error = str(
                    e)[:500] + email.body if 'email' in locals() else str(e)[:500]
                failed += 1

        await db.commit()
        return {"processed": processed, "sent": sent, "failed": failed}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unable to send reminders right now. Please try again later."
        ) from e


@router.post("/advance-renewals")
async def advance_renewals(
    x_internal_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if x_internal_token != settings.INTERNAL_JOB_TOKEN:
        raise HTTPException(403, "Forbidden")

    try:
        processed, affected_users = await advance_due_renewals(db)
        await db.commit()

        for user_id in affected_users:
            await cache_delete_prefix(f"subs:list:{user_id}:")
            await cache_delete_prefix(f"analytics:{user_id}:")

        return {"processed": processed, "users": len(affected_users)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unable to advance renewals right now. Please try again later."
        ) from e
