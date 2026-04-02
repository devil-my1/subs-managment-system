import httpx
from fastapi import APIRouter, HTTPException, Query
from src.core.config import settings

router = APIRouter(prefix="/currency", tags=["currency"])

EXCHANGE_RATE_BASE = "https://v6.exchangerate-api.com/v6"


@router.get("/rate")
async def get_exchange_rate(
    from_currency: str = Query(..., alias="from", min_length=3, max_length=3),
    to_currency: str = Query(..., alias="to", min_length=3, max_length=3),
):
    """Proxy currency rate lookup through backend — API key never exposed to browser."""
    api_key = settings.EXCHANGE_RATE_API_KEY
    url = f"{EXCHANGE_RATE_BASE}/{api_key}/pair/{from_currency.upper()}/{to_currency.upper()}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Currency service unavailable")
        data = resp.json()
        if data.get("result") != "success":
            raise HTTPException(status_code=502, detail="Currency rate fetch failed")
        return {"from": from_currency.upper(), "to": to_currency.upper(), "rate": data["conversion_rate"]}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Currency service unreachable") from e
