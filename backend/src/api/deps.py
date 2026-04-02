from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.core.security import decode_token
from src.models.user import User
from src.utils.cache import cache_get_json, cache_set_json
from src.core.config import settings
from uuid import UUID
from datetime import datetime


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    cache_key = f"user:{user_id}"
    cached = await cache_get_json(cache_key)
    if cached:
        created = cached.get("created_at")
        name = cached.get("name") or "User"
        return User(
            id=UUID(cached["id"]),
            email=cached["email"],
            name=name,
            created_at=datetime.fromisoformat(created) if created else None,
        )

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    await cache_set_json(cache_key, {
        "id": str(user.id),
        "email": user.email,
        "name": user.name or "User",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }, ttl=settings.CACHE_USER_TTL)
    return user
