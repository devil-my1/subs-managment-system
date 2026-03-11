from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.db.session import get_db
from src.models.category import Category
from src.schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryModificationResponse,
    CategoryUpdate,
)


router = APIRouter(prefix="/categories", tags=["categories"])

GENERIC_ERROR = "Something went wrong. Please try again later."


@router.get("/", response_model=CategoryListResponse)
async def get_categories(
        user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    """
    Get list of categories for the current user.
    """
    try:
        q = (
            select(Category)
            .where(Category.user_id == user.id)
            .order_by(Category.name.asc())
        )
        res = await db.execute(q)
        categories = res.scalars().all()
        return CategoryListResponse(categories=categories)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unable to load categories. Please try again later."
        ) from e


@router.post(
    "/",
    response_model=CategoryModificationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
        payload: CategoryCreate,
        user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    """
    Create a new category for the current user.
    """
    try:
        new_category = Category(
            user_id=user.id,
            name=payload.name,
            color=payload.color,
        )
        db.add(new_category)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists",
            )

        await db.refresh(new_category)
        return CategoryModificationResponse.model_validate(new_category)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unable to create category. Please try again later."
        ) from e


@router.put("/{category_id}", response_model=CategoryModificationResponse)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a category by ID for the current user.
    """
    try:
        q = select(Category).where(
            Category.id == category_id,
            Category.user_id == user.id,
        )
        res = await db.execute(q)
        category = res.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        if payload.name is not None:
            category.name = payload.name
        if payload.color is not None:
            category.color = payload.color

        db.add(category)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists",
            )

        await db.refresh(category)
        return CategoryModificationResponse.model_validate(category)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unable to update category. Please try again later."
        ) from e


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a category by ID for the current user.
    """
    try:
        q = select(Category).where(
            Category.id == category_id,
            Category.user_id == user.id,
        )
        res = await db.execute(q)
        category = res.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        await db.delete(category)
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unable to delete category. Please try again later."
        ) from e
