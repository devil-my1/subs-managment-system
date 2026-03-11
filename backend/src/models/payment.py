import uuid
from datetime import date
from sqlalchemy import String, Date, DateTime, func, ForeignKey, UniqueConstraint, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"
    __table_args__ = (
        UniqueConstraint("subscription_id", "paid_at", "amount",
                         "currency", name="uq_payment_dedupe"),
        Index("ix_payments_user", "user_id"),
        Index("ix_payments_user_paid_at", "user_id", "paid_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(
        "subscriptions.id", ondelete="CASCADE"), nullable=False)

    paid_at: Mapped[date] = mapped_column(
        Date, nullable=False, default=date.today)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    note: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False)

    subscription = relationship("Subscription", back_populates="payments")
