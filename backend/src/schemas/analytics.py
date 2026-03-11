from pydantic import BaseModel, ConfigDict, Field


class SpendSummary(BaseModel):
    total_spent: float = Field(...,
                               description="Total amount spent in the given period")
    currency: str = Field(..., min_length=3, max_length=3,
                          description="Primary currency code")
    count: int = Field(...,
                       description="Number of transactions in the given period")
    model_config = ConfigDict(from_attributes=True)


class SpendByMonthItem(BaseModel):
    month: str = Field(...,
                       description="Month in YYYY-MM-DD format (start of month)")
    currency: str = Field(..., min_length=3, max_length=3)
    total: float = Field(...)
    model_config = ConfigDict(from_attributes=True)


class CategorySpendItem(BaseModel):
    category_id: str | None = Field(
        default=None, description="Category id or null for uncategorized")
    category_name: str = Field(...,
                               description="Name of the category or 'Other'")
    currency: str = Field(..., min_length=3, max_length=3)
    total: float = Field(...)
    model_config = ConfigDict(from_attributes=True)
