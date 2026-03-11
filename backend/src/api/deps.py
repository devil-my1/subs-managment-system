from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.core.security import decode_token
from src.models.user import User
from src.utils.cache import cache_get_json, cache_set_json
from src.core.config import settings
from uuid import UUID
from datetime import datetime


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
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
            password_hash=cached["password_hash"],
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
        "password_hash": user.password_hash,
        "name": user.name or "User",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }, ttl=settings.CACHE_USER_TTL)
    return user
