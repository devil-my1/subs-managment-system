from datetime import date
from pydantic import BaseModel, Field
from uuid import UUID


class PaymentCreate(BaseModel):
    paid_at: date | None = None
    amount: float
    currency: str = Field(min_length=3, max_length=3)
    note: str | None = None


class PaymentOut(BaseModel):
    id: UUID
    subscription_id: UUID
    paid_at: date
    amount: float
    currency: str
    note: str | None = None
