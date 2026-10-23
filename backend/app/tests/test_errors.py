"""Error handling and response envelope tests."""

from fastapi import APIRouter
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.errors import NotFoundError, ValidationError
from app.main import app

# Create a test router with endpoints designed to trigger errors
dummy_router = APIRouter(prefix="/test-errors")


class DummyInput(BaseModel):
    name: str = Field(..., min_length=3)
    age: int = Field(..., ge=0)


@dummy_router.post("/validate")
async def trigger_validation(payload: DummyInput) -> dict[str, str]:
    return {"status": "ok"}


@dummy_router.get("/custom-not-found")
async def trigger_custom_not_found():
    raise NotFoundError("Destination dst_123 not found.")


@dummy_router.get("/custom-validation")
async def trigger_custom_validation():
    raise ValidationError("Invalid date range provided.")


@dummy_router.get("/unhandled-server-error")
async def trigger_unhandled():
    raise ZeroDivisionError("Simulated division by zero")


# Attach test router to the app for testing
app.include_router(dummy_router)

client = TestClient(app, raise_server_exceptions=False)


def test_standard_404_error_format():
    """Verify non-existent route returns normalized error envelope."""
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "request_id" in data["error"]
    assert data["error"]["request_id"].startswith("req-")
    assert response.headers.get("X-Request-ID") == data["error"]["request_id"]


def test_custom_app_exception_handling():
    """Verify custom AppException generates normalized envelope and custom status."""
    response = client.get("/test-errors/custom-not-found")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "Destination dst_123 not found." in data["error"]["message"]
    assert "request_id" in data["error"]


def test_request_validation_error_format():
    """Verify invalid request body returns HTTP 422 with VALIDATION_ERROR and details."""
    response = client.post("/test-errors/validate", json={"name": "a", "age": -5})
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in data["error"]
    assert isinstance(data["error"]["details"], list)
    assert len(data["error"]["details"]) > 0


def test_unhandled_exception_sanitization():
    """Verify unhandled 500 error hides tracebacks and returns safe envelope with request_id."""
    response = client.get("/test-errors/unhandled-server-error")
    assert response.status_code == 500
    data = response.json()
    assert data["error"]["code"] == "INTERNAL_ERROR"
    assert "unexpected" in data["error"]["message"].lower()
    assert "ZeroDivisionError" not in data["error"]["message"]
    assert "request_id" in data["error"]
