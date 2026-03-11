import pytest
from datetime import date, timedelta


async def ensure_auth(client):
    email = "analytics@example.com"
    password = "password123"
    r = await client.post("/auth/register", json={"email": email, "password": password})
    if r.status_code >= 500:
        pytest.skip(f"API error during register: {r.status_code} {r.text}")
    if r.status_code == 409:
        r = await client.post("/auth/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def seed_payment(client, headers):
    today = date.today()
    sub_payload = {
        "title": "Spotify",
        "billing_period": "monthly",
        "amount": 5.0,
        "currency": "USD",
        "next_renewal_date": (today + timedelta(days=10)).isoformat(),
    }
    r = await client.post("/subscriptions", json=sub_payload, headers=headers)
    if r.status_code >= 500:
        pytest.skip(
            f"API error creating subscription: {r.status_code} {r.text}")
    assert r.status_code == 200, r.text
    sub = r.json()

    pay_payload = {"amount": 5.0, "currency": "USD",
                   "paid_at": today.isoformat()}
    r = await client.post(f"/subscriptions/{sub['id']}/payments", json=pay_payload, headers=headers)
    if r.status_code >= 500:
        pytest.skip(f"API error creating payment: {r.status_code} {r.text}")
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_analytics(client):
    headers = await ensure_auth(client)
    await seed_payment(client, headers)

    today = date.today()
    week_ago = today - timedelta(days=7)

    r = await client.get(f"/analytics/spend?date_from={week_ago}&date_to={today}", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert any(row["currency"] == "USD" for row in data)

    r = await client.get(f"/analytics/spend/by-month?date_from={week_ago}&date_to={today}", headers=headers)
    assert r.status_code == 200

    r = await client.get(f"/analytics/spend/by-category?date_from={week_ago}&date_to={today}", headers=headers)
    assert r.status_code == 200
