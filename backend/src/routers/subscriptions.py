from datetime import date, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.db.session import get_db
from src.models.subscription import Subscription
from src.schemas.subscriptions import SubscriptionCreate, SubscriptionUpdate, SubscriptionOut, SubscriptionMonthSummary
from src.schemas.common import Message
from src.schemas.renew import RenewIn
from src.schemas.payments import PaymentCreate, PaymentOut
from src.models.payment import SubscriptionPayment
from src.services.subscriptions import renew_subscription, regenerate_email_reminder
from src.utils.cache import cache_get_json, cache_set_json, cache_delete_prefix
from src.core.config import settings
from src.utils.logs import subscriptions_logger

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

GENERIC_ERROR = "Something went wrong. Please try again later."


@router.get("/metrics/monthly", response_model=list[SubscriptionMonthSummary], status_code=status.HTTP_200_OK)
async def subscription_monthly_summary(
    year: int | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Return monthly counts and sums based on recorded payments (paid_at) for the given year.
    Months with no payments return 0.
    """
    try:
        target_year = year or datetime.utcnow().year

        res = await db.execute(
            select(
                func.extract(
                    "month", SubscriptionPayment.paid_at).label("month"),
                SubscriptionPayment.currency.label("currency"),
                func.count().label("count"),
                func.sum(SubscriptionPayment.amount).label("amount"),
            )
            .where(
                SubscriptionPayment.user_id == user.id,
                func.extract(
                    "year", SubscriptionPayment.paid_at) == target_year,
            )
            .group_by("month", SubscriptionPayment.currency)
            .order_by("month")
        )

        rows = res.all()
        counts: dict[int, int] = {}
        amounts_by_currency: dict[int, dict[str, float]] = {}

        for row in rows:
            if not row.month:
                continue
            month_key = int(row.month)
            counts[month_key] = counts.get(month_key, 0) + int(row.count or 0)
            if month_key not in amounts_by_currency:
                amounts_by_currency[month_key] = {}
            curr_map = amounts_by_currency[month_key]
            curr = row.currency
            curr_map[curr] = curr_map.get(curr, 0.0) + float(row.amount or 0.0)

        summary = []
        for m in range(1, 13):
            currency_map = amounts_by_currency.get(m, {})
            total_amount = sum(currency_map.values())
            summary.append(
                SubscriptionMonthSummary(
                    month=m,
                    count=counts.get(m, 0),
                    amount=total_amount,
                    amounts_by_currency=currency_map,
                )
            )

        return summary
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscription_monthly_summary_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load monthly subscription metrics. Please try again later."
        ) from e


@router.get("", response_model=list[SubscriptionOut], status_code=status.HTTP_200_OK)
async def list_subscriptions(
    q: str | None = None,
    status: str | None = None,
    category_id: UUID | None = None,
    sort: str = "next_renewal_date",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        cache_key = f"subs:list:{user.id}:{q or ''}:{status or ''}:{category_id or ''}:{sort}:{limit}:{offset}"
        cached = await cache_get_json(cache_key)
        if cached is not None:
            subscriptions_logger.info("subscriptions_list cache hit", extra={
                                      "user_id": str(user.id), "cache_key": cache_key})
            return cached
        subscriptions_logger.info("subscriptions_list cache miss", extra={
                                  "user_id": str(user.id), "cache_key": cache_key})

        stmt = select(Subscription).where(Subscription.user_id == user.id)

        if q:
            like = f"%{q}%"
            stmt = stmt.where(or_(Subscription.title.ilike(
                like), Subscription.description.ilike(like)))

        if status:
            stmt = stmt.where(Subscription.status == status)

        if category_id:
            stmt = stmt.where(Subscription.category_id == category_id)

        if sort == "next_renewal_date":
            stmt = stmt.order_by(
                Subscription.next_renewal_date.asc().nullslast())
        else:
            stmt = stmt.order_by(desc(Subscription.updated_at))

        stmt = stmt.options(selectinload(Subscription.category))

        res = await db.execute(stmt.limit(limit).offset(offset))
        subs = res.scalars().all()
        subscriptions_logger.info(
            "subscriptions_list raw fetch",
            extra={"count": len(subs)},
        )
        payload = [
            SubscriptionOut.model_validate(
                s, from_attributes=True).model_dump()
            for s in subs
        ]
        await cache_set_json(cache_key, payload, ttl=settings.CACHE_LIST_TTL)
        subscriptions_logger.info(
            f"subscriptions_list computed {len(payload)} items",
            extra={
                "user_id": str(user.id),
                "count": len(payload),
                "cache_key": cache_key,
            },
        )
        return payload
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscriptions_list_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load subscriptions list. Please try again later."
        ) from e


@router.post("", response_model=SubscriptionOut)
async def create_subscription(
    data: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        sub = Subscription(**data.model_dump(), user_id=user.id)
        db.add(sub)
        await db.commit()
        res = await db.execute(
            select(Subscription)
            .options(selectinload(Subscription.category))
            .where(Subscription.id == sub.id)
        )
        sub = res.scalar_one()

        await cache_delete_prefix(f"subs:list:{user.id}:")
        await cache_delete_prefix(f"analytics:{user.id}:")

        subscriptions_logger.info("subscription_created", extra={
                                  "user_id": str(user.id), "subscription_id": str(sub.id)})

        # schedule reminder
        try:
            await regenerate_email_reminder(db, sub)
            await db.commit()
        except Exception:
            await db.rollback()

        return sub
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscription_create_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to create subscription right now. Please try again later."
        ) from e


@router.get("/{subscription_id}", response_model=SubscriptionOut)
async def get_subscription(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        res = await db.execute(
            select(Subscription)
            .options(selectinload(Subscription.category))
            .where(Subscription.id == subscription_id, Subscription.user_id == user.id)
        )
        sub = res.scalar_one_or_none()
        if not sub:
            raise HTTPException(404, "Subscription not found")
        subscriptions_logger.info("subscription_fetched", extra={
                                  "user_id": str(user.id), "subscription_id": str(sub.id)})
        return sub
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscription_get_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load the subscription. Please try again later."
        ) from e


@router.patch("/{subscription_id}", response_model=SubscriptionOut)
async def update_subscription(
    subscription_id: UUID,
    data: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        res = await db.execute(
            select(Subscription)
            .options(selectinload(Subscription.category))
            .where(Subscription.id == subscription_id, Subscription.user_id == user.id)
        )
        sub = res.scalar_one_or_none()
        if not sub:
            raise HTTPException(404, "Subscription not found")

        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(sub, k, v)

        await db.commit()
        res = await db.execute(
            select(Subscription)
            .options(selectinload(Subscription.category))
            .where(Subscription.id == sub.id)
        )
        sub = res.scalar_one()

        await cache_delete_prefix(f"subs:list:{user.id}:")
        await cache_delete_prefix(f"analytics:{user.id}:")

        subscriptions_logger.info("subscription_updated", extra={
                                  "user_id": str(user.id), "subscription_id": str(sub.id)})

        # reschedule reminder
        try:
            await regenerate_email_reminder(db, sub)
            await db.commit()
        except Exception:
            await db.rollback()

        return sub
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscription_update_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to update the subscription. Please try again later."
        ) from e


@router.delete("/{subscription_id}", response_model=Message)
async def delete_subscription(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        res = await db.execute(
            select(Subscription)
            .options(selectinload(Subscription.category))
            .where(Subscription.id == subscription_id, Subscription.user_id == user.id)
        )
        sub = res.scalar_one_or_none()
        if not sub:
            raise HTTPException(404, "Subscription not found")

        await db.delete(sub)
        await db.commit()

        await cache_delete_prefix(f"subs:list:{user.id}:")
        await cache_delete_prefix(f"analytics:{user.id}:")

        subscriptions_logger.info("subscription_deleted", extra={
                                  "user_id": str(user.id), "subscription_id": str(sub.id)})

        return Message(detail="Subscription deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscription_delete_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the subscription. Please try again later."
        ) from e


@router.post("/{subscription_id}/renew", response_model=SubscriptionOut)
async def renew(
    subscription_id: UUID,
    data: RenewIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        res = await db.execute(select(Subscription).where(Subscription.id == subscription_id, Subscription.user_id == user.id))
        sub = res.scalar_one_or_none()
        if not sub:
            raise HTTPException(404, "Subscription not found")

        paid_at = data.paid_at or date.today()
        amount = data.amount if data.amount is not None else float(sub.amount)
        currency = data.currency if data.currency is not None else sub.currency

        await renew_subscription(
            db,
            sub,
            paid_at=paid_at,
            amount=amount,
            currency=currency,
            note=data.note,
            advance=data.advance,
        )
        await db.commit()
        res = await db.execute(
            select(Subscription)
            .options(selectinload(Subscription.category))
            .where(Subscription.id == sub.id)
        )
        sub = res.scalar_one()
        await cache_delete_prefix(f"subs:list:{user.id}:")
        await cache_delete_prefix(f"analytics:{user.id}:")
        subscriptions_logger.info("subscription_renewed", extra={"user_id": str(
            user.id), "subscription_id": str(sub.id), "amount": amount, "currency": currency})
        return sub
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("subscription_renew_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to renew the subscription. Please try again later."
        ) from e


@router.get("/{subscription_id}/payments", response_model=list[PaymentOut])
async def list_payments(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        # ensure ownership
        owned = await db.execute(select(Subscription.id).where(Subscription.id == subscription_id, Subscription.user_id == user.id))
        if not owned.scalar_one_or_none():
            raise HTTPException(404, "Subscription not found or access denied")

        res = await db.execute(
            select(SubscriptionPayment)
            .where(SubscriptionPayment.subscription_id == subscription_id, SubscriptionPayment.user_id == user.id)
            .order_by(SubscriptionPayment.paid_at.desc())
        )
        payments = [
            PaymentOut(
                id=p.id, subscription_id=p.subscription_id, paid_at=p.paid_at,
                amount=float(p.amount), currency=p.currency, note=p.note
            )
            for p in res.scalars().all()
        ]
        subscriptions_logger.info("payments_listed", extra={"user_id": str(
            user.id), "subscription_id": str(subscription_id), "count": len(payments)})
        return payments
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("payments_list_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load payments for this subscription. Please try again later."
        ) from e


@router.post("/{subscription_id}/payments", response_model=PaymentOut)
async def add_payment(
    subscription_id: UUID,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        res = await db.execute(select(Subscription).where(Subscription.id == subscription_id, Subscription.user_id == user.id))
        sub = res.scalar_one_or_none()
        if not sub:
            raise HTTPException(404, "Subscription not found")

        payment = SubscriptionPayment(
            user_id=user.id,
            subscription_id=sub.id,
            paid_at=data.paid_at or date.today(),
            amount=data.amount,
            currency=data.currency,
            note=data.note,
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)

        await cache_delete_prefix(f"subs:list:{user.id}:")
        await cache_delete_prefix(f"analytics:{user.id}:")

        subscriptions_logger.info("payment_added", extra={"user_id": str(user.id), "subscription_id": str(
            sub.id), "payment_id": str(payment.id), "amount": data.amount, "currency": data.currency})

        return PaymentOut(
            id=payment.id, subscription_id=payment.subscription_id, paid_at=payment.paid_at,
            amount=float(payment.amount), currency=payment.currency, note=payment.note
        )
    except HTTPException:
        raise
    except Exception as e:
        subscriptions_logger.exception("payment_add_error", extra={
                                       "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to add payment right now. Please try again later."
        ) from e
