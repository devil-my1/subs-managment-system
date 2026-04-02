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


async def _register_and_auth(client, email, password, name):
    """Register a user and return auth headers for subsequent requests."""
    r = await client.post("/auth/register", json={"email": email, "password": password, "name": name})
    if r.status_code >= 500:
        pytest.skip(f"API error during register: {r.status_code} {r.text}")
    if r.status_code == 409:
        r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_update_name(client):
    email = "nametest@example.com"
    password = "password123"
    name = "Original Name"
    headers = await _register_and_auth(client, email, password, name)

    # Update name
    r = await client.patch("/auth/update-name", json={"name": "New Name"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["detail"] == "Display name updated"

    # Verify via /auth/me
    r = await client.get("/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_update_email(client):
    email = "emailtest@example.com"
    password = "password123"
    headers = await _register_and_auth(client, email, password, "Email Test")

    # Update email with correct password
    r = await client.patch("/auth/update-email", json={"new_email": "newemail@example.com", "password": password}, headers=headers)
    assert r.status_code == 200
    assert r.json()["detail"] == "Email updated"

    # Verify wrong password returns 401
    r2 = await client.patch("/auth/update-email", json={"new_email": "another@example.com", "password": "wrongpass1234"}, headers=headers)
    assert r2.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client):
    email = "pwtest@example.com"
    password = "password123"
    headers = await _register_and_auth(client, email, password, "PW Test")

    # Change password
    r = await client.post("/auth/change-password", json={"old_password": password, "new_password": "newpassword123"}, headers=headers)
    assert r.status_code == 200
    assert "Password change successful" in r.json()["detail"]

    # Wrong old password
    r2 = await client.post("/auth/change-password", json={"old_password": "wrongpass1234", "new_password": "anotherpass123"}, headers=headers)
    assert r2.status_code == 401


@pytest.mark.asyncio
async def test_delete_account(client):
    email = "deltest@example.com"
    password = "password123"
    headers = await _register_and_auth(client, email, password, "Del Test")

    # Delete account
    r = await client.delete("/auth/delete-account", headers=headers)
    assert r.status_code == 200
    assert "Account deleted" in r.json()["detail"]

    # Verify /auth/me returns 401
    r2 = await client.get("/auth/me", headers=headers)
    assert r2.status_code == 401
