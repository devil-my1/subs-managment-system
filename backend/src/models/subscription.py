import uuid
from datetime import date
from sqlalchemy import (
    String, Date, DateTime, func, ForeignKey, Boolean, Integer,
    Numeric, Enum, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base
import enum


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    canceled = "canceled"
    expired = "expired"


class BillingPeriod(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_user", "user_id"),
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_user_next_renewal",
              "user_id", "next_renewal_date"),
        Index("ix_subscriptions_user_category", "user_id", "category_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(
        as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    url: Mapped[str | None] = mapped_column(String, nullable=True)

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_renewal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    billing_period: Mapped[BillingPeriod] = mapped_column(
        Enum(BillingPeriod, name="billing_period"), nullable=False)
    auto_renew: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true")

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)

    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status"),
        nullable=False,
        server_default="active",
    )

    reminder_days_before: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="7")

    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[object] = mapped_column(DateTime(
        timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="subscriptions")
    category = relationship("Category", back_populates="subscriptions")
    payments = relationship(
        "SubscriptionPayment", back_populates="subscription", cascade="all, delete-orphan")
    reminders = relationship(
        "Reminder", back_populates="subscription", cascade="all, delete-orphan")

    @property
    def category_name(self) -> str | None:
        return self.category.name if self.category else None

    @property
    def category_color(self) -> str | None:
        return self.category.color if self.category else None
