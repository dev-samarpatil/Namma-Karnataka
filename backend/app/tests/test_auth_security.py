"""Tests for authentication security, JWT verification, and multi-tenant isolation."""

import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import AuthenticatedUser, verify_jwt_token
from app.main import app
from app.repositories.trips import InMemoryTripRepository
from app.tests.test_trips_api import sample_trip_payload

client = TestClient(app)

TEST_SECRET = "test-secret-key-1234567890-test-secret-32bytes"


@pytest.fixture(autouse=True)
def configure_test_jwt_secret(monkeypatch):
    """Set a known JWT secret, in-memory repo, and dev environment for predictable test operations."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(settings, "APP_ENV", "development")
    import app.repositories.trips as trips_module

    trips_module._trip_repository_instance = InMemoryTripRepository()
    yield
    trips_module._trip_repository_instance = None


def create_test_jwt(
    sub: str = "user-123",
    email: str = "test@example.com",
    role: str = "authenticated",
    aud: str = "authenticated",
    expires_in: int = 3600,
    secret: str = TEST_SECRET,
) -> str:
    """Helper to generate signed test JWTs."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "aud": aud,
        "iat": now,
        "exp": now + expires_in,
        "app_metadata": {"provider": "email"},
        "user_metadata": {"full_name": "Test User"},
    }
    return jwt.encode(payload, key=secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_verify_valid_jwt_token():
    """Verify that a validly signed, non-expired JWT returns an AuthenticatedUser."""
    token = create_test_jwt(sub="usr-abc-456", email="traveler@karnataka.gov.in")
    user = await verify_jwt_token(token)

    assert isinstance(user, AuthenticatedUser)
    assert user.user_id == "usr-abc-456"
    assert user.email == "traveler@karnataka.gov.in"
    assert user.role == "authenticated"
    assert user.is_demo is False
    assert user.user_metadata.get("full_name") == "Test User"


@pytest.mark.asyncio
async def test_reject_expired_jwt():
    """Verify that an expired token raises HTTP 401 with TOKEN_EXPIRED."""
    expired_token = create_test_jwt(expires_in=-60)
    with pytest.raises(AppError) as exc_info:
        await verify_jwt_token(expired_token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_reject_tampered_signature():
    """Verify that a token signed with the wrong key is rejected with HTTP 401."""
    wrong_key_token = create_test_jwt(secret="wrong-secret-signature-key-555555555")
    with pytest.raises(AppError) as exc_info:
        await verify_jwt_token(wrong_key_token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_reject_token_missing_sub():
    """Verify that a token missing 'sub' claim is rejected with HTTP 401."""
    now = int(time.time())
    payload = {"email": "nosub@example.com", "exp": now + 3600}
    token = jwt.encode(payload, key=TEST_SECRET, algorithm="HS256")

    with pytest.raises(AppError) as exc_info:
        await verify_jwt_token(token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_reject_token_invalid_audience():
    """Verify that a token with an unexpected audience is rejected."""
    token = create_test_jwt(aud="malicious-service")
    with pytest.raises(AppError) as exc_info:
        await verify_jwt_token(token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_demo_token_in_development():
    """Verify that demo token works in development mode."""
    user = await verify_jwt_token("test-token-user-1")
    assert user.user_id == "00000000-0000-0000-0000-000000000001"
    assert user.is_demo is True
    assert user.email == "user-1@example.com"


@pytest.mark.asyncio
async def test_demo_token_strictly_rejected_in_production(monkeypatch):
    """Verify that demo tokens are blocked with 401 in production environments."""
    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(AppError) as exc_info:
        await verify_jwt_token("test-token-user-1")

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "UNAUTHORIZED"


def test_api_unauthorized_without_token():
    """Verify that protected API endpoint rejects calls with no Authorization header."""
    res = client.get("/api/v1/trips")
    assert res.status_code == 401
    assert "www-authenticate" in res.headers
    assert res.headers["www-authenticate"] == "Bearer"
    data = res.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_api_invalid_malformed_token_rejected_with_401():
    """Verify that malformed or non-JWT token is rejected with HTTP 401 and WWW-Authenticate."""
    res = client.get("/api/v1/trips", headers={"Authorization": "Bearer totally-invalid-token"})
    assert res.status_code == 401
    assert "www-authenticate" in res.headers
    assert "Bearer" in res.headers["www-authenticate"]
    data = res.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_infrastructure_failure_when_unreachable(monkeypatch):
    """Verify that network failure during external verification raises HTTP 503 AUTH_UNAVAILABLE."""
    import httpx

    from app.core.security import verify_token_against_supabase_api

    monkeypatch.setattr(settings, "SUPABASE_URL", "https://unreachable.supabase.example.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "test-key")

    async def mock_get(*args, **kwargs):
        raise httpx.ConnectError("Connection refused by test")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(AppError) as exc_info:
        await verify_token_against_supabase_api("some.mock.jwt")

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "AUTH_UNAVAILABLE"


@pytest.mark.asyncio
async def test_auth_unconfigured_infrastructure_failure(monkeypatch):
    """Verify that when no auth service is configured, verifying an asymmetric JWT raises 503 AUTH_UNCONFIGURED."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", None)
    monkeypatch.setattr(settings, "SUPABASE_URL", None)

    # Validly formatted 3-part token
    token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl"
    with pytest.raises(AppError) as exc_info:
        await verify_jwt_token(token)

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "AUTH_UNCONFIGURED"


def test_api_authorized_with_valid_jwt():
    """Verify that protected API endpoint accepts valid JWT."""
    token = create_test_jwt(sub="00000000-0000-0000-0000-000000000001")
    res = client.get("/api/v1/trips", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data


def test_cross_user_isolation_with_jwt():
    """Verify that User A cannot read or delete User B's trips via JWT authentication."""
    token_user_a = create_test_jwt(sub="00000000-0000-0000-0000-00000000000a")
    token_user_b = create_test_jwt(sub="00000000-0000-0000-0000-00000000000b")

    # User A creates a trip
    trip_payload = sample_trip_payload()

    create_res = client.post(
        "/api/v1/trips",
        json=trip_payload,
        headers={"Authorization": f"Bearer {token_user_a}"},
    )
    assert create_res.status_code == 201
    trip_id = create_res.json()["id"]

    # User A can get their own trip
    get_res_a = client.get(
        f"/api/v1/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token_user_a}"},
    )
    assert get_res_a.status_code == 200

    # User B CANNOT get User A's trip (returns 404 to avoid leaking trip existence)
    get_res_b = client.get(
        f"/api/v1/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token_user_b}"},
    )
    assert get_res_b.status_code == 404
    assert get_res_b.json()["error"]["code"] == "TRIP_NOT_FOUND"

    # User B CANNOT delete User A's trip
    del_res_b = client.delete(
        f"/api/v1/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token_user_b}"},
    )
    assert del_res_b.status_code == 404

    # User A CAN delete their trip
    del_res_a = client.delete(
        f"/api/v1/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token_user_a}"},
    )
    assert del_res_a.status_code == 200
