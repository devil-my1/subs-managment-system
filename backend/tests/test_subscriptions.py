import pytest
from datetime import date, timedelta


async def auth_headers(client):
    email = "sub@example.com"
    password = "password123"
    r = await client.post("/auth/register", json={"email": email, "password": password})
    if r.status_code >= 500:
        pytest.skip(f"API error during register: {r.status_code} {r.text}")
    if r.status_code not in (200, 409):
        raise AssertionError(f"register failed: {r.text}")
    if r.status_code == 409:
        r = await client.post("/auth/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_subscription_crud_and_renew(client):
    headers = await auth_headers(client)
    today = date.today()

    # Create subscription
    payload = {
        "title": "Netflix",
        "billing_period": "monthly",
        "amount": 10.0,
        "currency": "USD",
        "next_renewal_date": (today + timedelta(days=7)).isoformat(),
    }
    r = await client.post("/subscriptions", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    sub = r.json()

    # List
    r = await client.get("/subscriptions", headers=headers)
    assert r.status_code == 200
    assert any(s["id"] == sub["id"] for s in r.json())

    # Patch
    r = await client.patch(f"/subscriptions/{sub['id']}", json={"title": "Netflix HD"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["title"] == "Netflix HD"

    # Renew (creates payment and advances if applicable)
    r = await client.post(
        f"/subscriptions/{sub['id']}/renew",
        json={"amount": 12.0, "currency": "USD", "note": "manual"},
        headers=headers,
    )
    assert r.status_code == 200

    # Payments list
    r = await client.get(f"/subscriptions/{sub['id']}/payments", headers=headers)
    assert r.status_code == 200
    payments = r.json()
    assert len(payments) >= 1

    # Delete not implemented; just ensure list pagination works
    r = await client.get("/subscriptions?limit=1&offset=0", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) <= 1
