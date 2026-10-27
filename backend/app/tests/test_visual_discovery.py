"""Unit and integration tests for AI Visual Place Discovery API."""

import io
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.visual_discovery import (
    ConfidenceLabel,
    VisualDiscoveryCandidate,
    VisualDiscoveryResponse,
)
from app.services.visual_discovery.service import VisualDiscoveryService


@pytest.fixture
def client():
    return TestClient(app)


def create_test_image(format="JPEG", size=(200, 200), color=(200, 150, 100)) -> bytes:
    """Helper to generate in-memory solid color image bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()


def create_spatial_test_image(
    format="JPEG",
    size=(200, 200),
    sky_color=(70, 130, 220),
    ground_color=(150, 142, 135),
) -> bytes:
    """Helper to generate spatial image with blue sky on top and stone/ruins with realistic texture on bottom."""
    img = Image.new("RGB", size)
    sky_h = int(size[1] * 0.35)
    for y in range(sky_h):
        for x in range(size[0]):
            img.putpixel((x, y), sky_color)
    for y in range(sky_h, size[1]):
        for x in range(size[0]):
            noise = ((x * 7 + y * 13) % 25) - 12
            r = max(0, min(255, ground_color[0] + noise))
            g = max(0, min(255, ground_color[1] + noise))
            b = max(0, min(255, ground_color[2] + noise))
            img.putpixel((x, y), (r, g, b))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# SCENARIO 1 & 2: Recognizable Photograph with Generic Filename (Pixel Understanding)
# ---------------------------------------------------------------------------


def test_analyze_image_generic_filename_pixel_similarity(client):
    """Test that a photograph with granite ruins + blue sky, named 'IMG_1234.jpg'
    (no landmark keywords in filename), is correctly identified via the visual similarity
    engine using pixel spatial traits.
    """
    img_bytes = create_spatial_test_image(
        sky_color=(60, 120, 210), ground_color=(152, 144, 136)
    )
    files = {"file": ("IMG_1234.jpg", img_bytes, "image/jpeg")}
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

    slugs = [c["slug"] for c in data["candidates"]]
    # Grounded in Hampi/heritage granite ruins
    assert any("hampi" in s for s in slugs)
    assert data["analysis_engine"] == "visual_similarity_engine"
    assert "privacy_notice" in data


def test_analyze_image_named_landmark_deterministic(client):
    """Test photo with explicit landmark token in filename."""
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


# ---------------------------------------------------------------------------
# SCENARIO 3: Strict Catalogue Grounding
# ---------------------------------------------------------------------------


def test_ai_proposed_hallucinated_slug_rejected():
    """Verify that an AI candidate proposing a fabricated slug not in the catalogue
    is strictly rejected, while valid catalogue candidates are retained.
    """
    repo = InMemoryDestinationRepository()
    service = VisualDiscoveryService(repo=repo)

    mock_ai_payload = {
        "is_confident": True,
        "observed_features": ["Ancient stone columns and chariot"],
        "candidates": [
            {
                "slug": "hampi",  # Maps via canonical slug mapping to vijaya-vittala-temple-hampi
                "match_score": 0.95,
                "confidence_label": "strong_match",
                "matching_reasons": ["Stone chariot architecture matches Vijayanagara style"],
            },
            {
                "slug": "hallucinated-fabricated-temple-not-in-catalog",
                "match_score": 0.99,
                "confidence_label": "strong_match",
                "matching_reasons": ["Invented fictional temple"],
            },
        ],
    }

    res = service._build_validated_response(mock_ai_payload)
    # The valid candidate must be retained and enriched, hallucinated candidate discarded
    assert len(res.candidates) == 1
    assert res.candidates[0].slug == "vijaya-vittala-temple-hampi"
    assert res.is_confident is True


# ---------------------------------------------------------------------------
# SCENARIO 4: Non-Karnataka / Flat Featureless Photograph
# ---------------------------------------------------------------------------


def test_analyze_image_non_karnataka_uncertainty(client):
    """Test ambiguous photograph without distinctive Karnataka landmarks returns
    honest no-confident-match without randomly guessing a destination.
    """
    # Flat solid grey without sky or distinctive landmark ratios
    img_bytes = create_test_image("JPEG", color=(100, 100, 100))
    files = {"file": ("vacation_photo.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/visual-discovery/analyze-image", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["is_confident"] is False
    assert len(data["candidates"]) == 0
    assert "could not reliably identify" in data["message_en"].lower()
    assert len(data["message_kn"]) > 0


# ---------------------------------------------------------------------------
# SCENARIO 5: Malformed Upload & Error Handling
# ---------------------------------------------------------------------------


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
    huge_data = b"0" * (11 * 1024 * 1024)
    files = {"file": ("giant.jpg", huge_data, "image/jpeg")}
    response = client.post("/api/v1/visual-discovery/analyze-image", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "FILE_TOO_LARGE"


# ---------------------------------------------------------------------------
# SCENARIO 6: Mocked Multimodal AI Provider Integration & Graceful Fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_multimodal_ai_provider_success():
    """Verify that when Gemini multimodal API succeeds, candidates are returned
    with analysis_engine == 'ai_multimodal'.
    """
    repo = InMemoryDestinationRepository()
    service = VisualDiscoveryService(repo=repo)

    mock_gemini_response = VisualDiscoveryResponse(
        query_type="image",
        is_confident=True,
        message_en="Identified Vijaya Vittala Temple Hampi.",
        message_kn="ವಿಜಯ ವಿಠ್ಠಲ ದೇವಾಲಯ ಹಂಪೆ.",
        candidates=[
            VisualDiscoveryCandidate(
                destination_id="11111111-1111-4111-8111-111111111105",
                slug="vijaya-vittala-temple-hampi",
                name_en="Vijaya Vittala Temple (Hampi)",
                name_kn="ವಿಜಯ ವಿಠ್ಠಲ ದೇವಾಲಯ (ಹಂಪಿ)",
                district_code="KA-VJY",
                category="heritage",
                match_score=0.96,
                confidence_label=ConfidenceLabel.STRONG_MATCH,
                matching_reasons=["Stone Chariot at Vittala Temple complex"],
            )
        ],
        analyzed_at="2026-10-27T00:00:00Z",
        analysis_engine="ai_multimodal",
        privacy_notice="Processed ephemerally in memory.",
    )

    from app.core.config import settings

    with (
        patch.object(type(settings), "is_gemini_configured", True),
        patch.object(settings, "AI_ENABLE_LIVE_PROVIDERS", True),
        patch.object(service, "_call_gemini_multimodal", return_value=mock_gemini_response),
    ):
        img_bytes = create_test_image("JPEG")
        res = await service.analyze_image(
            image_bytes=img_bytes,
            filename="unnamed_photo.jpg",
            language="en",
        )

        assert res.is_confident is True
        assert len(res.candidates) == 1
        assert res.candidates[0].slug == "vijaya-vittala-temple-hampi"
        assert res.analysis_engine == "ai_multimodal"


@pytest.mark.asyncio
async def test_multimodal_ai_provider_failure_falls_back():
    """Verify that when AI provider raises an exception, service gracefully falls back
    to visual similarity/deterministic profile without crashing.
    """
    repo = InMemoryDestinationRepository()
    service = VisualDiscoveryService(repo=repo)

    from app.core.config import settings

    with (
        patch.object(type(settings), "is_gemini_configured", True),
        patch.object(settings, "AI_ENABLE_LIVE_PROVIDERS", True),
        patch.object(service, "_call_gemini_multimodal", side_effect=RuntimeError("AI Timeout")),
    ):
        img_bytes = create_spatial_test_image(
            sky_color=(60, 120, 210), ground_color=(152, 144, 136)
        )
        res = await service.analyze_image(
            image_bytes=img_bytes,
            filename="IMG_8888.jpg",
            language="en",
        )

        assert res.is_confident is True
        assert len(res.candidates) >= 1
        assert res.analysis_engine == "visual_similarity_engine"


# ---------------------------------------------------------------------------
# SCENARIO 7: Video Upload Bounded Keyframe Processing
# ---------------------------------------------------------------------------


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
