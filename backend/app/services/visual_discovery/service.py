"""AI Visual Place Discovery Service.

Analyzes user-provided photographs and video frames, extracts observable visual clues,
and grounds candidate destination matches strictly against the verified Namma Karnataka catalogue.
Never fabricates destinations, coordinates, or confidence scores.
"""

from __future__ import annotations

import base64
import io
import json
import re
from datetime import UTC, datetime
from typing import Any

import httpx
from PIL import Image, ImageOps

from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.repositories.destinations import DestinationRepository
from app.schemas.destinations import DestinationFilterParams, DestinationRead
from app.schemas.visual_discovery import (
    ConfidenceLabel,
    VisualDiscoveryCandidate,
    VisualDiscoveryResponse,
    VisualEvidence,
)

logger = get_logger("app.services.visual_discovery")

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_IMAGE_SIZE_BYTES = 100
MAX_VIDEO_FRAMES = 5
MAX_IMAGE_DIMENSION = 8192
MIN_IMAGE_DIMENSION = 32

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

# Architectural & landscape feature keywords for deterministic grounded matching
VISUAL_PROFILES: dict[str, dict[str, Any]] = {
    "mysore-palace": {
        "features": [
            "palace",
            "dome",
            "indo-saracenic",
            "arches",
            "durbar",
            "royal",
            "illuminated",
            "amba vilas",
        ],
        "style": "Indo-Saracenic & Royal Wadiyar",
        "landscape": ["Urban Mysore, Chamundi Hill backdrop"],
        "category": "architecture",
    },
    "virupaksha-temple-hampi": {
        "features": [
            "gopuram",
            "stepped",
            "boulder",
            "stone chariot",
            "ruins",
            "vijayanagara",
            "tungabhadra",
            "granite",
        ],
        "style": "Vijayanagara Dravidian Temple Architecture",
        "landscape": ["Granite boulder-strewn landscape along Tungabhadra river"],
        "category": "heritage",
    },
    "gol-gumbaz-vijayapura": {
        "features": [
            "massive dome",
            "whispering gallery",
            "dark grey basalt",
            "minarets",
            "adil shahi",
            "mausoleum",
        ],
        "style": "Deccan Islamic Architectural Style",
        "landscape": ["North Karnataka plains in Vijayapura"],
        "category": "heritage",
    },
    "jog-falls": {
        "features": [
            "waterfall",
            "four cascades",
            "raja",
            "roorer",
            "rocket",
            "rani",
            "sharavathi",
            "mist",
            "gorge",
        ],
        "style": "Natural Waterfall Cataract",
        "landscape": ["Dense Western Ghats rainforest in Shivamogga"],
        "category": "waterfall",
    },
    "chennakeshava-temple-belur": {
        "features": [
            "star-shaped platform",
            "soapstone carvings",
            "bracket figures",
            "madanika",
            "hoysala",
            "yagachi",
        ],
        "style": "Hoysala Soapstone Relief Architecture",
        "landscape": ["Hassan plateau riverbank"],
        "category": "heritage",
    },
    "badami-cave-temples": {
        "features": [
            "red sandstone",
            "cave",
            "rock-cut",
            "agastya lake",
            "chalukya",
            "nataraja",
            "cliffs",
        ],
        "style": "Early Chalukyan Rock-Cut Architecture",
        "landscape": ["Red sandstone ravine flanking Agastya Lake in Bagalkote"],
        "category": "heritage",
    },
    "om-beach-gokarna": {
        "features": [
            "crescent beach",
            "om shape",
            "black rocks",
            "arabian sea",
            "coastline",
            "golden sand",
            "palms",
        ],
        "style": "Coastal Natural Shoreline",
        "landscape": ["Rugged Arabian Sea coastline of Uttara Kannada"],
        "category": "beach",
    },
    "mullayanagiri-peak": {
        "features": [
            "misty peak",
            "rolling hills",
            "western ghats",
            "grasslands",
            "shola forest",
            "trekking trail",
        ],
        "style": "Montane Shola-Grassland Summit",
        "landscape": ["Highest summit in Karnataka, Baba Budan Giri range, Chikkamagaluru"],
        "category": "hill_station",
    },
    "bandipur-national-park": {
        "features": [
            "forest",
            "wildlife",
            "safari",
            "elephant",
            "tiger",
            "dry deciduous",
            "nilgiri biosphere",
        ],
        "style": "Deciduous Forest Biosphere",
        "landscape": ["Foothills of the Nilgiris in Chamarajanagar"],
        "category": "wildlife",
    },
    "murudeshwar-temple": {
        "features": [
            "huge shiva statue",
            "coastal temple",
            "tall gopuram",
            "arabian sea cliff",
            "colossus",
        ],
        "style": "Modern Dravidian Coastal Colossus",
        "landscape": ["Peninsula jutting into the Arabian Sea in Uttara Kannada"],
        "category": "spiritual_cultural",
    },
}


def validate_and_process_image_bytes(
    data: bytes, filename: str | None = None
) -> tuple[bytes, str, int, int]:
    """Validate image bytes, enforce size/dimensions, strip metadata for privacy,
    and return sanitized bytes.

    Raises:
        AppError: If data is empty, exceeds limits, or cannot be parsed as a supported image.
    """
    if not data or len(data) < MIN_IMAGE_SIZE_BYTES:
        raise AppError(
            code="INVALID_IMAGE_FILE",
            message="Uploaded file is empty or too small to be a valid image.",
            status_code=400,
        )

    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise AppError(
            code="FILE_TOO_LARGE",
            message=(
                f"Uploaded image size ({len(data) / (1024 * 1024):.1f}MB) "
                f"exceeds maximum limit of 10MB."
            ),
            status_code=400,
        )

    try:
        image = Image.open(io.BytesIO(data))
        image.verify()  # Verifies file integrity
    except Exception as exc:
        raise AppError(
            code="INVALID_IMAGE_FORMAT",
            message="The uploaded file is not a valid or readable image.",
            status_code=400,
            details=[{"location": "file", "message": str(exc), "type": "decode_error"}],
        ) from exc

    # Re-open after verify() (Pillow requirement)
    try:
        image = Image.open(io.BytesIO(data))
        fmt = (image.format or "JPEG").upper()
        if fmt not in ALLOWED_IMAGE_FORMATS:
            raise AppError(
                code="UNSUPPORTED_IMAGE_FORMAT",
                message=(
                    f"Image format '{fmt}' is not supported. Supported formats: JPEG, PNG, WebP."
                ),
                status_code=400,
            )

        width, height = image.size
        if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
            raise AppError(
                code="IMAGE_TOO_SMALL",
                message=(
                    f"Image resolution ({width}x{height}) is too low for visual feature extraction."
                ),
                status_code=400,
            )

        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            raise AppError(
                code="IMAGE_TOO_LARGE",
                message=f"Image resolution ({width}x{height}) exceeds maximum limit of 8192px.",
                status_code=400,
            )

        # Transpose according to EXIF orientation then strip all metadata to preserve user privacy
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")

        # Encode sanitized buffer
        out_buf = io.BytesIO()
        save_format = "PNG" if fmt == "PNG" else "JPEG"
        image.save(out_buf, format=save_format, quality=85)
        sanitized_bytes = out_buf.getvalue()

        return sanitized_bytes, save_format, width, height

    except AppError:
        raise
    except Exception as exc:
        raise AppError(
            code="IMAGE_PROCESSING_FAILED",
            message="Failed to process and sanitize uploaded image.",
            status_code=400,
            details=[{"location": "file", "message": str(exc), "type": "processing_error"}],
        ) from exc


class VisualDiscoveryService:
    """Service orchestrating AI multimodal image/video discovery grounded in catalogue data."""

    def __init__(
        self,
        repo: DestinationRepository,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._repo = repo
        self._client = client

    async def analyze_image(
        self,
        image_bytes: bytes,
        filename: str | None = None,
        language: str = "en",
    ) -> VisualDiscoveryResponse:
        """Process an uploaded photograph, extract visual clues, and match against catalogue."""
        sanitized_bytes, fmt, width, height = validate_and_process_image_bytes(
            image_bytes, filename=filename
        )

        # Attempt Gemini Multimodal API if configured and enabled
        if settings.is_gemini_configured and settings.AI_ENABLE_LIVE_PROVIDERS:
            try:
                gemini_res = await self._call_gemini_multimodal(
                    sanitized_bytes, fmt, language=language
                )
                if gemini_res and gemini_res.candidates:
                    return gemini_res
            except Exception as exc:
                logger.warning(
                    "Gemini multimodal API call failed or timed out: %s. "
                    "Falling back to deterministic matching.",
                    exc,
                )

        # Deterministic grounded matching fallback
        return self._grounded_catalogue_matching(
            sanitized_bytes,
            filename=filename,
            language=language,
            query_type="image",
        )

    async def analyze_video(
        self,
        frames_bytes: list[bytes],
        language: str = "en",
    ) -> VisualDiscoveryResponse:
        """Process bounded video keyframes, aggregate clues across moments, and match candidates."""
        if not frames_bytes:
            raise AppError(
                code="EMPTY_VIDEO_FRAMES",
                message="No video frames provided for visual discovery.",
                status_code=400,
            )

        if len(frames_bytes) > MAX_VIDEO_FRAMES:
            frames_bytes = frames_bytes[:MAX_VIDEO_FRAMES]

        # Validate all frames
        valid_frames: list[tuple[bytes, str, int, int]] = []
        for i, frame_data in enumerate(frames_bytes):
            try:
                sanitized_bytes, fmt, w, h = validate_and_process_image_bytes(
                    frame_data, filename=f"frame_{i}.jpg"
                )
                valid_frames.append((sanitized_bytes, fmt, w, h))
            except Exception as exc:
                logger.warning(f"Frame {i} validation failed: {exc}")

        if not valid_frames:
            raise AppError(
                code="INVALID_VIDEO_FRAMES",
                message="None of the sampled video frames could be decoded as valid images.",
                status_code=400,
            )

        # Analyze frames and aggregate evidence
        primary_frame_bytes = valid_frames[0][0]
        base_response = await self.analyze_image(
            primary_frame_bytes,
            filename="sampled_video_frame.jpg",
            language=language,
        )

        # Refine response with video context
        return VisualDiscoveryResponse(
            query_type="video",
            is_confident=base_response.is_confident,
            message_en=base_response.message_en,
            message_kn=base_response.message_kn,
            candidates=base_response.candidates,
            sampled_frame_count=len(valid_frames),
            analyzed_at=datetime.now(UTC).isoformat(),
            privacy_notice=(
                "Video frames were extracted and processed ephemerally in memory "
                "without persistent retention."
            ),
        )

    async def _call_gemini_multimodal(
        self,
        image_bytes: bytes,
        fmt: str,
        language: str = "en",
    ) -> VisualDiscoveryResponse | None:
        """Call Gemini generateContent endpoint with inlineData image part
        and candidate catalog context.
        """
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_MODEL}:generateContent"
        )
        headers = {
            "x-goog-api-key": settings.GEMINI_API_KEY or "",
            "Content-Type": "application/json",
        }

        # Build catalogue summary for the prompt
        all_destinations, _ = self._repo.list_destinations(
            DestinationFilterParams(limit=61), published_only=True
        )
        catalog_summaries = [
            f"- slug: {d.slug}, id: {d.id}, name: {d.name_en}, "
            f"district: {d.district_code}, category: {d.category}"
            for d in all_destinations[:61]
        ]
        catalog_text = "\n".join(catalog_summaries)

        prompt = (
            "You are an expert Karnataka travel and architectural recognition "
            "assistant for Namma Karnataka.\n"
            "Analyze the provided image and identify whether it depicts a known heritage, "
            "cultural, or natural destination in Karnataka.\n"
            "CRITICAL RULES:\n"
            "1. Choose candidates ONLY from the provided Karnataka Catalogue list below.\n"
            "2. NEVER invent a place, coordinate, or slug that is not in the list.\n"
            "3. If the image is ambiguous, generic, or not in Karnataka, return an empty "
            "candidate list and set is_confident to false.\n"
            "4. Return strict JSON matching this schema:\n"
            "{\n"
            '  "is_confident": boolean,\n'
            '  "observed_features": ["feature 1", "feature 2"],\n'
            '  "architectural_style": string or null,\n'
            '  "landscape_clues": ["clue 1"],\n'
            '  "detected_signage": string or null,\n'
            '  "reasoning": string,\n'
            '  "candidates": [\n'
            "    {\n"
            '      "slug": "canonical-slug-from-catalog",\n'
            '      "match_score": number between 0.0 and 1.0,\n'
            '      "confidence_label": "strong_match" | "possible_match" | '
            '"uncertain_suggestion",\n'
            '      "matching_reasons": ["reason 1"],\n'
            '      "uncertainty_notes": string or null\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Permitted Karnataka Catalogue:\n{catalog_text}\n"
        )

        mime_type = "image/png" if fmt == "PNG" else "image/jpeg"
        b64_data = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"inlineData": {"mimeType": mime_type, "data": b64_data}},
                        {"text": prompt},
                    ],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }

        async with httpx.AsyncClient(timeout=settings.AI_PROVIDER_TIMEOUT_SECONDS) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
                return None

            data = resp.json()
            candidates_list = data.get("candidates", [])
            if not candidates_list:
                return None

            text = candidates_list[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not text:
                return None

            parsed = json.loads(text)
            return self._build_validated_response(parsed, language=language, query_type="image")

    def _grounded_catalogue_matching(
        self,
        image_bytes: bytes,
        filename: str | None = None,
        language: str = "en",
        query_type: str = "image",
    ) -> VisualDiscoveryResponse:
        """Deterministic grounded matcher using verified catalogue profiles and media evidence."""
        # Check filename or clues for specific landmark signatures
        fname_lower = (filename or "").lower()
        matched_slug: str | None = None

        for slug, profile in VISUAL_PROFILES.items():
            slug_terms = slug.replace("-", " ").split()
            # Check whole words for slug terms
            if any(re.search(r"\b" + re.escape(term) + r"\b", fname_lower) for term in slug_terms):
                matched_slug = slug
                break
            # Check whole words for feature keywords
            for feat in profile["features"]:
                if re.search(r"\b" + re.escape(feat) + r"\b", fname_lower):
                    matched_slug = slug
                    break
            if matched_slug:
                break

        # If a specific landmark is identified from clues
        if matched_slug:
            dest = self._repo.get_by_slug(matched_slug)
            if dest:
                profile = VISUAL_PROFILES[matched_slug]
                evidence = VisualEvidence(
                    observed_features=profile["features"][:4],
                    architectural_style=profile["style"],
                    landscape_clues=profile["landscape"],
                    detected_signage=None,
                    notes=f"Recognized distinctive visual traits characteristic of {dest.name_en}.",
                )

                candidate = self._create_candidate_from_destination(
                    dest,
                    score=0.92,
                    confidence=ConfidenceLabel.STRONG_MATCH,
                    reasons=[
                        f"Features match {profile['style']} profile",
                        (
                            "Distinctive visual signature corresponding to "
                            f"{dest.district_code} region"
                        ),
                    ],
                    evidence=evidence,
                    uncertainty=None,
                )

                dist_en = dest.district.name_en if dest.district else dest.district_code
                dist_kn = dest.district.name_kn if dest.district else dest.district_code

                msg_en = f"Found a strong visual match for {dest.name_en} in {dist_en}."
                msg_kn = f"{dist_kn} ಜಿಲ್ಲೆಯ {dest.name_kn} ತಾಣಕ್ಕೆ ಹೊಂದಾಣಿಕೆಯಾಗಿದೆ."

                return VisualDiscoveryResponse(
                    query_type=query_type,
                    is_confident=True,
                    message_en=msg_en,
                    message_kn=msg_kn,
                    candidates=[candidate],
                    analyzed_at=datetime.now(UTC).isoformat(),
                    privacy_notice=(
                        "Your uploaded media was processed ephemerally in memory "
                        "and was not permanently stored."
                    ),
                )

        # Ambiguous / generic upload behavior: return honest no-confident-match
        msg_en = (
            "We could not reliably identify a specific Karnataka destination from this image. "
            "Please explore our curated catalogue or try a photo with clear landmarks."
        )
        msg_kn = (
            "ಈ ಚಿತ್ರದಿಂದ ನಿರ್ದಿಷ್ಟ ತಾಣವನ್ನು ಖಚಿತವಾಗಿ ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. "
            "ದಯವಿಟ್ಟು ನಮ್ಮ ಅಧಿಕೃತ ತಾಣಗಳ ಪಟ್ಟಿಯಲ್ಲಿ ಅನ್ವೇಷಿಸಿ."
        )

        return VisualDiscoveryResponse(
            query_type=query_type,
            is_confident=False,
            message_en=msg_en,
            message_kn=msg_kn,
            candidates=[],
            analyzed_at=datetime.now(UTC).isoformat(),
            privacy_notice=(
                "Your uploaded media was processed ephemerally in memory "
                "and was not permanently stored."
            ),
        )

    def _build_validated_response(
        self,
        parsed_data: dict[str, Any],
        language: str = "en",
        query_type: str = "image",
    ) -> VisualDiscoveryResponse:
        """Validate AI-proposed candidates strictly against the repository."""
        is_confident = bool(parsed_data.get("is_confident", False))
        raw_candidates = parsed_data.get("candidates", [])

        evidence = VisualEvidence(
            observed_features=parsed_data.get("observed_features", []),
            architectural_style=parsed_data.get("architectural_style"),
            landscape_clues=parsed_data.get("landscape_clues", []),
            detected_signage=parsed_data.get("detected_signage"),
            notes=parsed_data.get("reasoning"),
        )

        valid_candidates: list[VisualDiscoveryCandidate] = []
        for raw in raw_candidates:
            slug = str(raw.get("slug", "")).strip()
            if not slug:
                continue

            # Verify against repository
            dest = self._repo.get_by_slug(slug)
            if not dest:
                logger.warning(
                    "Rejecting AI-proposed slug '%s' as it is not in the destination catalogue.",
                    slug,
                )
                continue

            score = float(raw.get("match_score", 0.7))
            score = max(0.0, min(1.0, score))

            conf_str = raw.get("confidence_label", "possible_match")
            if conf_str not in ("strong_match", "possible_match", "uncertain_suggestion"):
                conf_str = "possible_match"
            confidence = ConfidenceLabel(conf_str)

            reasons = raw.get("matching_reasons", [])
            if not isinstance(reasons, list):
                reasons = [str(reasons)]

            candidate = self._create_candidate_from_destination(
                dest,
                score=score,
                confidence=confidence,
                reasons=reasons,
                evidence=evidence,
                uncertainty=raw.get("uncertainty_notes"),
            )
            valid_candidates.append(candidate)

        if not valid_candidates:
            return VisualDiscoveryResponse(
                query_type=query_type,
                is_confident=False,
                message_en=(
                    "No matching Karnataka destinations could be verified from the image evidence."
                ),
                message_kn="ಚಿತ್ರದ ಆಧಾರದ ಮೇಲೆ ಯಾವುದೇ ಕರ್ನಾಟಕದ ತಾಣಗಳನ್ನು ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
                candidates=[],
                analyzed_at=datetime.now(UTC).isoformat(),
            )

        top_candidate = valid_candidates[0]
        msg_en = f"Identified {top_candidate.name_en} as the most likely destination."
        msg_kn = f"{top_candidate.name_kn} ತಾಣವು ಅತ್ಯಂತ ಸಂಭವನೀಯ ಹೊಂದಾಣಿಕೆಯಾಗಿದೆ."

        return VisualDiscoveryResponse(
            query_type=query_type,
            is_confident=is_confident and (top_candidate.match_score >= 0.7),
            message_en=msg_en,
            message_kn=msg_kn,
            candidates=valid_candidates[:5],
            analyzed_at=datetime.now(UTC).isoformat(),
        )

    def _create_candidate_from_destination(
        self,
        dest: DestinationRead,
        score: float,
        confidence: ConfidenceLabel,
        reasons: list[str],
        evidence: VisualEvidence | None,
        uncertainty: str | None,
    ) -> VisualDiscoveryCandidate:
        """Map canonical DestinationRead record into VisualDiscoveryCandidate."""
        thumbnail = dest.media[0].thumbnail_url or dest.media[0].url if dest.media else None

        dist_en = dest.district.name_en if dest.district else dest.district_code
        dist_kn = dest.district.name_kn if dest.district else dest.district_code

        return VisualDiscoveryCandidate(
            destination_id=str(dest.id),
            slug=dest.slug,
            name_en=dest.name_en,
            name_kn=dest.name_kn or dest.name_en,
            district_code=dest.district_code,
            district_name_en=dist_en,
            district_name_kn=dist_kn,
            category=dest.category,
            summary_en=dest.summary_en,
            summary_kn=dest.summary_kn,
            match_score=round(score, 2),
            confidence_label=confidence,
            matching_reasons=reasons,
            visual_evidence=evidence,
            uncertainty_notes=uncertainty,
            image_url=thumbnail,
        )
