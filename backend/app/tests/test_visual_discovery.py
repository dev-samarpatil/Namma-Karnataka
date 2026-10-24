"""Unit and integration tests for AI Visual Place Discovery API."""

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.visual_discovery import ConfidenceLabel
from app.services.visual_discovery.service import VisualDiscoveryService


@pytest.fixture
def client():
    return TestClient(app)


def create_test_image(format="JPEG", size=(200, 200), color=(200, 150, 100)) -> bytes:
    """Helper to generate in-memory valid image bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()


def test_analyze_image_valid_match(client):
    """Test uploading a photo matching a known landmark signature returns grounded candidate."""
    img_bytes = create_test_image("JPEG")
    files = {"file": ("mysore-palace-evening.jpg", img_bytes, "image/jpeg")}
    response = client.post(
        "/api/v1/visual-discovery/analyze-image",
        files=files,
        data={"language": "en"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "image"
    assert data["is_confident"] is True
    assert len(data["candidates"]) >= 1

    top = data["candidates"][0]
    assert top["slug"] == "mysore-palace"
    assert "Mysuru Palace" in top["name_en"]
    assert top["district_code"] == "KA-MYS"
    assert top["confidence_label"] == ConfidenceLabel.STRONG_MATCH
    assert "privacy_notice" in data


def test_analyze_image_ambiguous_returns_uncertainty(client):
    """Test ambiguous photograph without distinctive landmarks returns honest no-confident-match."""
    img_bytes = create_test_image("JPEG", color=(100, 100, 100))
    files = {"file": ("random_vacation_photo.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/visual-discovery/analyze-image", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["is_confident"] is False
    assert len(data["candidates"]) == 0
    assert "could not reliably identify" in data["message_en"].lower()
    assert "ಕನ್ನಡ" in data["message_kn"] or len(data["message_kn"]) > 0


def test_analyze_image_empty_file_rejected(client):
    """Test empty file is rejected with HTTP 400."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/v1/visual-discovery/analyze-image", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_IMAGE_FILE"


def test_analyze_image_corrupted_file_rejected(client):
    """Test non-image bytes disguised as jpeg are rejected."""
    files = {"file": ("fake.jpg", b"NOT_A_VALID_IMAGE_CONTENT" * 10, "image/jpeg")}
    response = client.post("/api/v1/visual-discovery/analyze-image", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_IMAGE_FORMAT"


def test_analyze_image_oversized_rejected(client):
    """Test image exceeding 10MB limit is rejected."""
    # 11MB of mock padding
    huge_data = b"0" * (11 * 1024 * 1024)
    files = {"file": ("giant.jpg", huge_data, "image/jpeg")}
    response = client.post("/api/v1/visual-discovery/analyze-image", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "FILE_TOO_LARGE"


def test_analyze_video_bounded_frames(client):
    """Test video analysis with sampled keyframes aggregates visual discovery."""
    f1 = create_test_image("JPEG", color=(180, 120, 80))
    f2 = create_test_image("JPEG", color=(190, 130, 90))

    files = [
        ("frames", ("hampi_frame1.jpg", f1, "image/jpeg")),
        ("frames", ("hampi_frame2.jpg", f2, "image/jpeg")),
    ]
    response = client.post("/api/v1/visual-discovery/analyze-video", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "video"
    assert data["sampled_frame_count"] == 2
    assert "privacy_notice" in data


def test_analyze_video_missing_media_rejected(client):
    """Test video endpoint without frames or file is rejected with 400."""
    response = client.post("/api/v1/visual-discovery/analyze-video", data={})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MISSING_MEDIA"


def test_ai_proposed_hallucinated_slug_rejected():
    """Verify that an AI candidate with a fabricated slug not in the catalogue
    is strictly rejected.
    """
    repo = InMemoryDestinationRepository()
    service = VisualDiscoveryService(repo=repo)

    mock_ai_payload = {
        "is_confident": True,
        "observed_features": ["Ancient stone columns"],
        "candidates": [
            {
                "slug": "hallucinated-fabricated-temple-not-in-catalog",
                "match_score": 0.99,
                "confidence_label": "strong_match",
                "matching_reasons": ["Invented reason"],
            }
        ],
    }

    res = service._build_validated_response(mock_ai_payload)
    # The hallucinated candidate must be discarded
    assert len(res.candidates) == 0
    assert res.is_confident is False
