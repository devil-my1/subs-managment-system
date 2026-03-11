import uuid

from pydantic import BaseModel, Field, ConfigDict


HEX_COLOR_PATTERN = r"^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8}|[0-9a-fA-F]{3}|[0-9a-fA-F]{4})$"


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)


class CategoryListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    categories: list["CategoryRead"]


class CategoryCreate(CategoryBase):
    pass


class CategoryModificationResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class CategoryRead(CategoryModificationResponse):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)


CategoryListResponse.model_rebuild()
