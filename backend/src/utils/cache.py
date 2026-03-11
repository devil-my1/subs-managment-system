import json
from typing import Any

import redis.asyncio as redis

from src.core.config import settings

_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _client


async def cache_get_json(key: str) -> Any | None:
    val = await _get_client().get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except json.JSONDecodeError:
        return None


async def cache_set_json(key: str, value: Any, *, ttl: int) -> None:
    await _get_client().set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete_prefix(prefix: str) -> None:
    client = _get_client()
    cursor = 0
    pattern = f"{prefix}*"
    while True:
        cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
        if keys:
            await client.delete(*keys)
        if cursor == 0:
            break


async def cache_delete_key(key: str) -> None:
    await _get_client().delete(key)
