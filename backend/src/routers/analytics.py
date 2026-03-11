from __future__ import annotations

from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import and_, between, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import DateTime

from src.api.deps import get_current_user
from src.core.config import settings
from src.db.session import get_db
from src.models.category import Category
from src.models.payment import SubscriptionPayment
from src.models.subscription import Subscription
from src.schemas.analytics import (
    CategorySpendItem,
    SpendByMonthItem,
    SpendSummary,
)
from src.utils.cache import cache_get_json, cache_set_json
from src.utils.logs import analytics_logger

router = APIRouter(prefix="/analytics", tags=["analytics"])

GENERIC_ERROR = "Something went wrong. Please try again later."


def _summary_zero(currency: str = "USD") -> dict:
    return {"total_spent": 0, "currency": currency, "count": 0}


@router.get("/spend", response_model=SpendSummary)
async def spend_summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Total spend grouped by currency.
    """
    try:
        cache_key = f"analytics:{user.id}:spend:{date_from}:{date_to}"
        cached = await cache_get_json(cache_key)
        if cached is not None:
            analytics_logger.info("spend_summary cache hit", extra={"user_id": str(
                user.id), "from": str(date_from), "to": str(date_to)})
            return cached
        analytics_logger.info("spend_summary cache miss", extra={
                              "user_id": str(user.id), "from": str(date_from), "to": str(date_to)})

        q = select(
            func.coalesce(func.sum(SubscriptionPayment.amount),
                          0).label("total"),
            func.count(SubscriptionPayment.id).label("count"),
            func.min(SubscriptionPayment.currency).label("currency"),
        ).where(
            and_(
                SubscriptionPayment.user_id == user.id,
                between(SubscriptionPayment.paid_at, date_from, date_to),
            )
        )

        total, count, currency = (await db.execute(q)).one()
        if total is None:
            out = _summary_zero()
        else:
            out = {
                "total_spent": float(total) if total is not None else 0.0,
                "currency": currency or "USD",
                "count": int(count),
            }

        analytics_logger.info(
            "spend_summary computed",
            extra={
                "user_id": str(user.id),
                "from": str(date_from),
                "to": str(date_to),
                "total": out.get("total_spent"),
                "count": out.get("count"),
            },
        )

        await cache_set_json(cache_key, out, ttl=settings.CACHE_ANALYTICS_TTL)
        return SpendSummary.model_validate(out)
    except HTTPException:
        raise
    except Exception as e:
        analytics_logger.exception("spend_summary_error", extra={
                                   "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load spend summary. Please try again later."
        ) from e


@router.get("/spend/by-month", response_model=list[SpendByMonthItem])
async def spend_by_month(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Spend grouped by month + currency.
    """
    try:
        cache_key = f"analytics:{user.id}:spend-month:{date_from}:{date_to}"
        cached = await cache_get_json(cache_key)
        if cached is not None:
            analytics_logger.info("spend_by_month cache hit", extra={
                                  "user_id": str(user.id), "from": str(date_from), "to": str(date_to)})
            return cached
        analytics_logger.info("spend_by_month cache miss", extra={
                              "user_id": str(user.id), "from": str(date_from), "to": str(date_to)})

        month = func.date_trunc("month", cast(
            SubscriptionPayment.paid_at, DateTime())).label("month")
        q = (
            select(
                month,
                SubscriptionPayment.currency.label("currency"),
                func.coalesce(func.sum(SubscriptionPayment.amount),
                              0).label("total"),
            )
            .where(
                and_(
                    SubscriptionPayment.user_id == user.id,
                    between(SubscriptionPayment.paid_at, date_from, date_to),
                )
            )
            .group_by(month, SubscriptionPayment.currency)
            .order_by(month.asc(), SubscriptionPayment.currency.asc())
        )
        rows = (await db.execute(q)).all()
        out = [{"month": m.date().isoformat(), "currency": c,
                "total": float(t)} for m, c, t in rows]
        analytics_logger.info(
            "spend_by_month computed",
            extra={
                "user_id": str(user.id),
                "from": str(date_from),
                "to": str(date_to),
                "rows": len(out),
            },
        )
        await cache_set_json(cache_key, out, ttl=settings.CACHE_ANALYTICS_TTL)
        return [SpendByMonthItem.model_validate(item) for item in out]
    except HTTPException:
        raise
    except Exception as e:
        analytics_logger.exception("spend_by_month_error", extra={
                                   "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load spend by month. Please try again later."
        ) from e


@router.get("/spend/by-category", response_model=list[CategorySpendItem])
async def spend_by_category(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Spend grouped by category + currency.
    """
    try:
        cache_key = f"analytics:{user.id}:spend-category:{date_from}:{date_to}"
        cached = await cache_get_json(cache_key)
        if cached is not None:
            analytics_logger.info("spend_by_category cache hit", extra={
                                  "user_id": str(user.id), "from": str(date_from), "to": str(date_to)})
            return cached
        analytics_logger.info("spend_by_category cache miss", extra={
                              "user_id": str(user.id), "from": str(date_from), "to": str(date_to)})

        q = (
            select(
                Category.id.label("category_id"),
                Category.name.label("category_name"),
                SubscriptionPayment.currency.label("currency"),
                func.coalesce(func.sum(SubscriptionPayment.amount),
                              0).label("total"),
            )
            .select_from(SubscriptionPayment)
            .join(Subscription, Subscription.id == SubscriptionPayment.subscription_id)
            .outerjoin(Category, Category.id == Subscription.category_id)
            .where(
                and_(
                    SubscriptionPayment.user_id == user.id,
                    between(SubscriptionPayment.paid_at, date_from, date_to),
                )
            )
            .group_by(Category.id, Category.name, SubscriptionPayment.currency)
            .order_by(
                func.coalesce(Category.name, "Other").asc(),
                SubscriptionPayment.currency.asc(),
            )
        )
        rows = (await db.execute(q)).all()
        out = [
            {
                "category_id": str(cat_id) if cat_id else None,
                "category_name": cat_name or "Other",
                "currency": currency,
                "total": float(total),
            }
            for cat_id, cat_name, currency, total in rows
        ]
        analytics_logger.info(
            "spend_by_category computed",
            extra={
                "user_id": str(user.id),
                "from": str(date_from),
                "to": str(date_to),
                "rows": len(out),
            },
        )
        await cache_set_json(cache_key, out, ttl=settings.CACHE_ANALYTICS_TTL)
        return [CategorySpendItem.model_validate(item) for item in out]
    except HTTPException:
        raise
    except Exception as e:
        analytics_logger.exception("spend_by_category_error", extra={
                                   "user_id": str(user.id)})
        raise HTTPException(
            status_code=500,
            detail="Unable to load spend by category. Please try again later."
        ) from e
