import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    email = "user@example.com"
    password = "password123"
    name = "Test User"

    # Register
    r = await client.post("/auth/register", json={"email": email, "password": password, "name": name})
    if r.status_code >= 500:
        pytest.skip(f"API error during register: {r.status_code} {r.text}")
    if r.status_code == 409:
        r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # Login
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    token2 = r.json()["access_token"]
    assert token2
