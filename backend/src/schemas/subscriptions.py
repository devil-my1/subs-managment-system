from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from src.schemas.category import CategoryRead
from src.models.subscription import BillingPeriod, SubscriptionStatus


class SubscriptionBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    url: str | None = None

    start_date: date | None = None
    next_renewal_date: date | None = None
    end_date: date | None = None

    billing_period: BillingPeriod | None = None
    auto_renew: bool = True

    amount: float
    currency: str = Field(min_length=3, max_length=3)

    status: SubscriptionStatus = SubscriptionStatus.active
    reminder_days_before: int = Field(default=7, ge=0, le=365)


class SubscriptionCreate(SubscriptionBase):
    category_id: UUID | None = None


class SubscriptionUpdate(BaseModel):
    title: str | None = None
    category_id: UUID | None = None
    description: str | None = None
    url: str | None = None
    start_date: date | None = None
    next_renewal_date: date | None = None
    end_date: date | None = None
    billing_period: BillingPeriod | None = None
    auto_renew: bool | None = None
    amount: float | None = None
    currency: str | None = None
    status: SubscriptionStatus | None = None
    reminder_days_before: int | None = None


class SubscriptionOut(SubscriptionBase):
    id: UUID
    user_id: UUID
    category: CategoryRead | None = None
    model_config = ConfigDict(from_attributes=True)


class SubscriptionMonthSummary(BaseModel):
    month: int = Field(ge=1, le=12)
    count: int = Field(ge=0)
    amount: float = Field(default=0, ge=0)
    amounts_by_currency: dict[str, float] = Field(default_factory=dict)
