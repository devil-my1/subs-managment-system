import uuid
from sqlalchemy import String, DateTime, func, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (UniqueConstraint(
        "subscription_id", "channel", "scheduled_for", name="uq_reminder_idempotent"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(
        "subscriptions.id", ondelete="CASCADE"), nullable=False)

    channel: Mapped[str] = mapped_column(
        String, nullable=False)  # 'email' or 'push'
    scheduled_for: Mapped[object] = mapped_column(
        DateTime(timezone=True), nullable=False)
    sent_at: Mapped[object | None] = mapped_column(
        DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="pending")  # pending/sent/failed/canceled
    last_error: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False)

    subscription = relationship("Subscription", back_populates="reminders")
