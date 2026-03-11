from datetime import date
from pydantic import BaseModel, Field


class RenewIn(BaseModel):
    paid_at: date | None = None
    amount: float | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    note: str | None = None
    advance: bool = True
