import os
import pytest
import pytest_asyncio
import httpx


@pytest.fixture(scope="session")
def api_url():
    return os.getenv("API_URL", "http://localhost:5050/api/v1")


@pytest_asyncio.fixture(scope="function")
async def client(api_url):
    async with httpx.AsyncClient(base_url=api_url, follow_redirects=True, timeout=5.0) as c:
        try:
            resp = await c.get("/openapi.json", timeout=2.0)
            if resp.status_code >= 500:
                pytest.skip(f"API not healthy: status {resp.status_code}")
        except Exception as exc:
            pytest.skip(f"API not reachable: {exc}")
        yield c
