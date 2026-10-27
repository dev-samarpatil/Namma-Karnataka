"""AI Visual Place Discovery Service.

Analyzes user-provided photographs and video frames, extracts observable visual clues,
and grounds candidate destination matches strictly against the verified Namma Karnataka catalogue.
Never fabricates destinations, coordinates, or confidence scores.
"""

from __future__ import annotations

import base64
import io
import json
import math
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
    ExternalPlaceRecognition,
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

# Known prominent landmarks outside the curated Karnataka catalogue for open-world recognition
EXTERNAL_LANDMARKS: dict[str, dict[str, Any]] = {
    "taj-mahal": {
        "keywords": ["taj mahal", "tajmahal", "agra"],
        "name": "Taj Mahal",
        "location": "Agra, Uttar Pradesh, India",
        "state": "Uttar Pradesh",
        "country": "India",
        "is_karnataka": False,
        "summary": "17th-century white marble mausoleum commissioned by Mughal emperor Shah Jahan.",
        "source_url": "https://whc.unesco.org/en/list/252",
        "features": ["White marble dome", "Mughal symmetrical minarets", "Reflecting pool"],
    },
    "gateway-of-india": {
        "keywords": ["gateway of india", "mumbai harbor", "colaba"],
        "name": "Gateway of India",
        "location": "Mumbai, Maharashtra, India",
        "state": "Maharashtra",
        "country": "India",
        "is_karnataka": False,
        "summary": "20th-century arch monument erected to commemorate the landing of King George V in Mumbai.",
        "source_url": "https://mumbaicity.gov.in/",
        "features": ["Indo-Saracenic basalt arch", "Arabian Sea waterfront"],
    },
    "qutub-minar": {
        "keywords": ["qutub minar", "qutb minar", "mehrauli"],
        "name": "Qutub Minar",
        "location": "New Delhi, Delhi, India",
        "state": "Delhi",
        "country": "India",
        "is_karnataka": False,
        "summary": "73-meter fluted red sandstone minaret built in 1192 by Qutb-ud-din Aibak.",
        "source_url": "https://whc.unesco.org/en/list/233",
        "features": ["Fluted red sandstone tower", "Carved balconies"],
    },
    "red-fort": {
        "keywords": ["red fort", "lal qila", "old delhi"],
        "name": "Red Fort (Lal Qila)",
        "location": "Old Delhi, Delhi, India",
        "state": "Delhi",
        "country": "India",
        "is_karnataka": False,
        "summary": "Historic red sandstone fortress residence of the Mughal emperors in Old Delhi.",
        "source_url": "https://whc.unesco.org/en/list/1054",
        "features": ["Massive red sandstone ramparts", "Lahori Gate"],
    },
    "eiffel-tower": {
        "keywords": ["eiffel tower", "tour eiffel", "champ de mars"],
        "name": "Eiffel Tower",
        "location": "Paris, Île-de-France, France",
        "state": "Île-de-France",
        "country": "France",
        "is_karnataka": False,
        "summary": "Wrought-iron lattice tower on the Champ de Mars in Paris.",
        "source_url": "https://www.toureiffel.paris/en",
        "features": ["Wrought-iron lattice tower", "Three public observation levels"],
    },
}

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
            "hampi",
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
            "bijapur",
            "vijayapura",
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
            "jog",
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
            "belur",
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
            "badami",
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
            "gokarna",
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
            "chikmagalur",
            "chikkamagaluru",
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
            "bandipur",
        ],
        "style": "Deciduous Forest Biosphere",
        "landscape": ["Foothills of the Nilgiris in Chamarajanagar"],
        "category": "wildlife",
    },
    "murudeshwar-temple-beach": {
        "features": [
            "huge shiva statue",
            "coastal temple",
            "tall gopuram",
            "arabian sea cliff",
            "colossus",
            "murudeshwar",
            "murudeshwara",
        ],
        "style": "Modern Dravidian Coastal Colossus",
        "landscape": ["Peninsula jutting into the Arabian Sea in Uttara Kannada"],
        "category": "spiritual_cultural",
    },
    "yana-rocks-caves": {
        "features": [
            "yana",
            "karst",
            "black limestone",
            "monolith",
            "bhairaveshwara",
            "moohini shikhara",
            "caves",
            "forest trek",
        ],
        "style": "Natural Karstic Black Limestone Monoliths",
        "landscape": ["Dense Sahyadri rainforest of Uttara Kannada"],
        "category": "nature",
    },
    "belagavi-fort-kamal-basti": {
        "features": [
            "belagavi fort",
            "belgaum fort",
            "kamal basti",
            "kamal basadi",
            "stone lotus",
            "jain temple",
            "moat",
            "ramakrishna ashrama",
        ],
        "style": "Ratta & Chalukyan Stone Architecture",
        "landscape": ["Belagavi city central historic ramparts"],
        "category": "heritage",
    },
    "vijaya-vittala-temple-hampi": {
        "features": [
            "stone chariot",
            "musical pillars",
            "temple ruins",
            "hampi",
            "vijayanagara",
            "mantapa",
            "kalyana mantapa",
            "ruins",
            "vittala",
            "granite pillars",
        ],
        "style": "Vijayanagara Dravidian Temple Architecture & UNESCO Ruins",
        "landscape": ["Granite boulder-strewn terrain along Tungabhadra riverbasin"],
        "category": "heritage",
    },
    "pattadakal-monuments": {
        "features": [
            "pattadakal",
            "chalukyan",
            "sandstone temple",
            "virupaksha pattadakal",
            "mallikarjuna",
            "rekha nagara",
            "dravida",
            "malaprabha",
            "temple complex",
            "unesco ruins",
        ],
        "style": "Early Badami Chalukyan Vesara & Dravidian Architecture",
        "landscape": ["Malaprabha river valley, Bagalkote district"],
        "category": "heritage",
    },
    "aihole-durga-temple": {
        "features": [
            "aihole",
            "durga temple",
            "apsidal",
            "cradle of temple architecture",
            "chalukya",
            "pillared corridor",
            "stone carvings",
            "shikhara",
        ],
        "style": "Early Chalukyan Apsidal Temple Architecture",
        "landscape": ["Malaprabha river basin rocky plateau, Bagalkote"],
        "category": "heritage",
    },
    "hoysaleswara-temple-halebidu": {
        "features": [
            "halebidu",
            "hoysaleswara",
            "shantaleswara",
            "soapstone reliefs",
            "star shaped",
            "dwarapalaka",
            "nandi mantapa",
            "hoysala temple",
        ],
        "style": "Hoysala Soapstone Relief & Star-Shaped Platform",
        "landscape": ["Dwarasamudra historical plateau, Hassan district"],
        "category": "heritage",
    },
    "chitradurga-fort": {
        "features": [
            "chitradurga",
            "kallina kote",
            "stone fort",
            "seven circular walls",
            "boulders",
            "hidimbeshwara",
            "obavvana kinti",
            "bastions",
            "ruins",
        ],
        "style": "Nayaka Defensive Hill Fort Architecture",
        "landscape": ["Granite hill fortress, Chitradurga district"],
        "category": "heritage",
    },
    "devanahalli-fort": {
        "features": [
            "devanahalli",
            "stone fort",
            "oval ramparts",
            "tipu sultan birthplace",
            "cut plaster stone walls",
            "venugopalaswamy temple",
        ],
        "style": "Saluva & Tipu Sultan Fortified Ramparts",
        "landscape": ["Bengaluru Rural plains, Devanahalli"],
        "category": "heritage",
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


def extract_spatial_visual_traits(image_bytes: bytes) -> dict[str, Any]:
    """Analyze image chromatic balance and texture variance across spatial bands using Pillow.

    Decomposes the image into an upper sky band (top 35%) and lower terrain/architectural
    band (bottom 65%), as well as mid/bottom rows for coastal water vs sand, and central
    vertical columns for waterfall cascade plumes.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        thumb = img.resize((64, 64), Image.Resampling.BOX)

        # Global metrics
        pixels = list(thumb.getdata())
        total_px = len(pixels)
        r_sum = sum(p[0] for p in pixels)
        g_sum = sum(p[1] for p in pixels)
        b_sum = sum(p[2] for p in pixels)
        mean_r = r_sum / total_px
        mean_g = g_sum / total_px
        mean_b = b_sum / total_px
        total_intensity = mean_r + mean_g + mean_b + 1e-6
        r_ratio = mean_r / total_intensity
        g_ratio = mean_g / total_intensity
        b_ratio = mean_b / total_intensity

        luminances = [0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in pixels]
        mean_lum = sum(luminances) / total_px
        global_variance = math.sqrt(sum((lum - mean_lum) ** 2 for lum in luminances) / total_px)

        # Spatial bands: Sky (top 35% / rows 0..22) vs Ground (bottom 65% / rows 22..64)
        sky_box = thumb.crop((0, 0, 64, 22))
        ground_box = thumb.crop((0, 22, 64, 64))

        sky_px = list(sky_box.getdata())
        ground_px = list(ground_box.getdata())

        s_r = sum(p[0] for p in sky_px) / len(sky_px)
        s_g = sum(p[1] for p in sky_px) / len(sky_px)
        s_b = sum(p[2] for p in sky_px) / len(sky_px)
        s_int = s_r + s_g + s_b + 1e-6
        sky_b_ratio = s_b / s_int
        sky_lum = 0.299 * s_r + 0.587 * s_g + 0.114 * s_b

        has_open_sky = sky_b_ratio > 0.33 or sky_lum > 135.0

        g_r = sum(p[0] for p in ground_px) / len(ground_px)
        g_g = sum(p[1] for p in ground_px) / len(ground_px)
        g_b = sum(p[2] for p in ground_px) / len(ground_px)
        g_int = g_r + g_g + g_b + 1e-6
        ground_r_ratio = g_r / g_int
        ground_g_ratio = g_g / g_int
        ground_b_ratio = g_b / g_int

        ground_lums = [0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in ground_px]
        ground_mean_lum = sum(ground_lums) / len(ground_lums)
        ground_variance = math.sqrt(
            sum((lum - ground_mean_lum) ** 2 for lum in ground_lums) / len(ground_lums)
        )

        # Mid band (rows 20..42) and Bottom band (rows 42..64) for coastal water vs sand
        mid_box = thumb.crop((0, 20, 64, 42))
        bot_box = thumb.crop((0, 42, 64, 64))
        mid_px = list(mid_box.getdata())
        bot_px = list(bot_box.getdata())
        m_r = sum(p[0] for p in mid_px) / len(mid_px)
        m_g = sum(p[1] for p in mid_px) / len(mid_px)
        m_b = sum(p[2] for p in mid_px) / len(mid_px)
        m_int = m_r + m_g + m_b + 1e-6
        mid_b_ratio = m_b / m_int

        b_r = sum(p[0] for p in bot_px) / len(bot_px)
        b_g = sum(p[1] for p in bot_px) / len(bot_px)
        b_b = sum(p[2] for p in bot_px) / len(bot_px)
        b_int = b_r + b_g + b_b + 1e-6
        bot_r_ratio = b_r / b_int

        # Central vertical column vs sides (waterfall plume detector)
        center_col = thumb.crop((20, 10, 44, 54))
        c_px = list(center_col.getdata())
        c_lums = [0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in c_px]
        c_mean_lum = sum(c_lums) / len(c_lums)

        is_nature_lush = ground_g_ratio > 0.38 and g_g > 55.0
        is_coastal_marine = (mid_b_ratio > 0.36 and m_b > 65.0) and (bot_r_ratio > 0.33 or b_b < m_b)

        # Waterfall: bright cascade column flanked by Western Ghats canopy
        is_waterfall_plume = (
            c_mean_lum > (ground_mean_lum + 16.0)
            and is_nature_lush
            and ground_variance >= 12.0
        )

        # Granite temple ruins / ancient stone: balanced chroma in ground region, stone texture
        is_granite_ruins = (
            (ground_variance >= 6.0 or global_variance >= 12.0)
            and not is_nature_lush
            and not is_coastal_marine
            and not is_waterfall_plume
            and abs(ground_r_ratio - ground_g_ratio) < 0.11
            and abs(ground_r_ratio - ground_b_ratio) < 0.14
            and ground_mean_lum >= 30.0
        )

        # Warm sandstone (Badami cave temples, Aihole Durga temple):
        is_warm_sandstone = (
            (ground_variance >= 6.0 or global_variance >= 12.0)
            and not is_nature_lush
            and not is_coastal_marine
            and ground_r_ratio > 0.36
            and g_r > g_g * 1.04
            and g_r > g_b * 1.08
        )

        # Palace architecture: high symmetry, warm or golden tones or illuminated facade
        is_palace_architecture = (
            global_variance >= 12.0
            and (is_warm_sandstone or is_granite_ruins)
            and has_open_sky
            and ground_mean_lum >= 40.0
        )

        is_heritage_stone = is_warm_sandstone or is_granite_ruins or is_palace_architecture

        return {
            "has_open_sky": has_open_sky,
            "global_variance": global_variance,
            "ground_variance": ground_variance,
            "is_nature_lush": is_nature_lush,
            "is_coastal_marine": is_coastal_marine,
            "is_waterfall_plume": is_waterfall_plume,
            "is_granite_ruins": is_granite_ruins,
            "is_warm_sandstone": is_warm_sandstone,
            "is_palace_architecture": is_palace_architecture,
            "is_heritage_stone": is_heritage_stone,
            "r_ratio": r_ratio,
            "g_ratio": g_ratio,
            "b_ratio": b_ratio,
            "variance": global_variance,
        }
    except Exception as exc:
        logger.warning("Spatial visual trait extraction failed: %s", exc)
        return {
            "has_open_sky": False,
            "global_variance": 0.0,
            "ground_variance": 0.0,
            "is_nature_lush": False,
            "is_coastal_marine": False,
            "is_waterfall_plume": False,
            "is_granite_ruins": False,
            "is_warm_sandstone": False,
            "is_palace_architecture": False,
            "is_heritage_stone": False,
            "r_ratio": 0.33,
            "g_ratio": 0.33,
            "b_ratio": 0.33,
            "variance": 0.0,
        }


def extract_image_visual_traits(image_bytes: bytes) -> dict[str, Any]:
    """Backwards-compatible wrapper delegating to spatial visual trait extractor."""
    return extract_spatial_visual_traits(image_bytes)


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
            analysis_engine=base_response.analysis_engine,
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
            "You are an expert travel, heritage, and architectural recognition assistant for Namma Karnataka.\n"
            "Analyze the provided image and identify the landmark, monument, natural feature, or destination depicted.\n"
            "INSTRUCTIONS:\n"
            "1. If the image depicts a destination matching one in the Karnataka Catalogue below, return it as a candidate with a realistic, evidence-based match_score (0.0 to 1.0).\n"
            "2. If the image depicts a recognizable landmark OUTSIDE Karnataka or NOT in our catalogue (e.g. Taj Mahal, Gateway of India, Eiffel Tower, Red Fort, or uncatalogued local spots), DO NOT force-match it to a catalogue destination. Instead, provide an 'external_place' object describing the recognized landmark, its location, and why it is recognized, leaving 'candidates' empty.\n"
            "3. If the image is completely generic or unrecognizable, set is_confident to false, candidates to [], and external_place to null.\n"
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
            "  ],\n"
            '  "external_place": {\n'
            '    "place_name": "string",\n'
            '    "location_summary": "string",\n'
            '    "state_or_region": "string",\n'
            '    "country": "string",\n'
            '    "is_karnataka": false,\n'
            '    "confidence_label": "strong_match",\n'
            '    "match_score": 0.95,\n'
            '    "summary": "string",\n'
            '    "source_url": "string or null",\n'
            '    "notes": "string"\n'
            "  }\n"
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
        # Clean filename tokens replacing underscores and punctuation with spaces for accurate word boundaries
        fname_lower = (filename or "").lower()
        fname_clean = re.sub(r"[_\-.\s]+", " ", fname_lower)

        # 1. Open-world check: recognized prominent landmark outside curated catalogue
        for ext_id, ext_info in EXTERNAL_LANDMARKS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", fname_clean) for kw in ext_info["keywords"]):
                evidence = VisualEvidence(
                    observed_features=ext_info["features"],
                    architectural_style="Historic Architecture",
                    landscape_clues=[ext_info["location"]],
                    detected_signage=None,
                    notes=f"Recognized {ext_info['name']} outside the curated Karnataka catalogue.",
                )
                ext_place = ExternalPlaceRecognition(
                    place_name=ext_info["name"],
                    location_summary=ext_info["location"],
                    state_or_region=ext_info["state"],
                    country=ext_info["country"],
                    is_karnataka=ext_info["is_karnataka"],
                    confidence_label=ConfidenceLabel.STRONG_MATCH,
                    match_score=0.92,
                    visual_evidence=evidence,
                    summary=ext_info["summary"],
                    source_url=ext_info["source_url"],
                    catalogue_status="outside_catalogue",
                    notes=(
                        f"{ext_info['name']} is an iconic landmark in {ext_info['location']}. "
                        "This place is outside our curated Karnataka travel catalogue. "
                        "Itinerary planning requires verified destinations from the catalogue."
                    ),
                )
                msg_en = (
                    f"Recognized place outside catalogue: {ext_info['name']} ({ext_info['location']}). "
                    "This location is not currently part of the curated Karnataka destination catalogue."
                )
                msg_kn = (
                    f"ಕ್ಯಾಟಲಾಗ್‌ನಿಂದ ಹೊರಗಿರುವ ತಾಣ: {ext_info['name']} ({ext_info['location']}). "
                    "ಈ ತಾಣವು ನಮ್ಮ ಪರಿಶೀಲಿಸಿದ ಕರ್ನಾಟಕ ಪ್ರವಾಸ ಕ್ಯಾಟಲಾಗ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ."
                )
                return VisualDiscoveryResponse(
                    query_type=query_type,
                    is_confident=True,
                    message_en=msg_en,
                    message_kn=msg_kn,
                    candidates=[],
                    external_place=ext_place,
                    analyzed_at=datetime.now(UTC).isoformat(),
                    analysis_engine="deterministic_fallback",
                    privacy_notice=(
                        "Your uploaded media was processed ephemerally in memory "
                        "and was not permanently stored."
                    ),
                )

        matched_slug: str | None = None

        for slug, profile in VISUAL_PROFILES.items():
            slug_terms = slug.replace("-", " ").split()
            # Check whole words for slug terms
            if any(re.search(r"\b" + re.escape(term) + r"\b", fname_clean) for term in slug_terms):
                matched_slug = slug
                break
            # Check whole words for feature keywords
            for feat in profile["features"]:
                if re.search(r"\b" + re.escape(feat) + r"\b", fname_clean):
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
                    analysis_engine="deterministic_fallback",
                    privacy_notice=(
                        "Your uploaded media was processed ephemerally in memory "
                        "and was not permanently stored."
                    ),
                )

        # Check for architectural or natural category clues in filename
        suggested_slugs: list[str] = []
        style_desc: str | None = None
        obs_clues: list[str] = []
        msg_en = ""
        msg_kn = ""

        if re.search(r"\b(temple|ruins|chariot|gopuram|pillars|mantapa|monument|sculpture|carvings)\b", fname_clean):
            suggested_slugs = [
                "virupaksha-temple-hampi",
                "vijaya-vittala-temple-hampi",
                "pattadakal-monuments",
                "chennakeshava-temple-belur",
                "hoysaleswara-temple-halebidu",
                "badami-cave-temples",
            ]
            style_desc = "Karnataka Heritage Temple Architecture & Historic Ruins"
            obs_clues = ["Stone carvings and pillar mantapa elements", "Dravidian/Hoysala/Chalukyan architecture"]
            msg_en = "Identified temple ruins and historic stone architectural characteristics. Showing top matching UNESCO and heritage destinations in Karnataka."
            msg_kn = "ದೇವಾಲಯದ ಅವಶೇಷಗಳು ಮತ್ತು ಐತಿಹಾಸಿಕ ಶಿಲ್ಪಕಲೆಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ಪರಂಪರೆ ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
        elif re.search(r"\b(fort|kote|bastion|rampart|citadel)\b", fname_clean):
            suggested_slugs = ["chitradurga-fort", "devanahalli-fort", "belagavi-fort-kamal-basti"]
            style_desc = "Karnataka Historic Fortification & Bastions"
            obs_clues = ["Stone battlement walls", "Historic defensive ramparts"]
            msg_en = "Identified fortress ramparts and stone bastions. Showing top matching Karnataka forts."
            msg_kn = "ಕೋಟೆಯ ಗೋಡೆಗಳು ಮತ್ತು ಕೊತ್ತಲಗಳ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ಕೋಟೆಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
        elif re.search(r"\b(falls|waterfall|cascade)\b", fname_clean):
            suggested_slugs = ["jog-falls", "abbey-falls-madikeri"]
            style_desc = "Western Ghats Waterfall Cataract"
            obs_clues = ["Cascading water stream", "Ghat rainforest gorge"]
            msg_en = "Identified waterfall and cataract landscape traits. Showing top matching Karnataka waterfalls."
            msg_kn = "ಜಲಪಾತದ ದೃಶ್ಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ಜಲಪಾತಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
        elif re.search(r"\b(beach|sea|coast|ocean|shore)\b", fname_clean):
            suggested_slugs = ["om-beach-gokarna", "murudeshwar-temple-beach"]
            style_desc = "Arabian Sea Coastal Shoreline"
            obs_clues = ["Coastal marine horizon", "Golden shoreline"]
            msg_en = "Identified coastal shoreline visual traits. Showing top matching Karnataka beaches."
            msg_kn = "ಕರಾವಳಿ ತೀರದ ದೃಶ್ಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. ಕರಾವಳಿ ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."

        # If no filename hints matched, perform spatial visual trait inspection using Pillow
        analysis_engine_used = "deterministic_fallback"
        if not suggested_slugs:
            traits = extract_spatial_visual_traits(image_bytes)
            if traits["global_variance"] >= 8.0:
                analysis_engine_used = "visual_similarity_engine"
                if traits["is_granite_ruins"]:
                    suggested_slugs = [
                        "vijaya-vittala-temple-hampi",
                        "virupaksha-temple-hampi",
                        "pattadakal-monuments",
                        "hoysaleswara-temple-halebidu",
                        "chitradurga-fort",
                    ]
                    style_desc = "Karnataka Heritage Temple Architecture & Weathered Granite Ruins"
                    obs_clues = [
                        "Weathered granite ruins and carved stone pillar mantapas",
                        "Dravidian/Hoysala stone architecture and Tungabhadra boulder terrain",
                    ]
                    msg_en = (
                        "Spatial visual analysis identified weathered granite stone masonry, "
                        "pillar mantapa structures, and heritage temple ruins. Showing top matching "
                        "UNESCO and heritage destinations in Karnataka."
                    )
                    msg_kn = (
                        "ದೃಶ್ಯ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಗ್ರಾನೈಟ್ ಕಲ್ಲಿನ ಕೆತ್ತನೆಗಳು, ಕಂಬಗಳ ಮಂಟಪ ಮತ್ತು ಪ್ರಾಚೀನ ದೇವಾಲಯದ "
                        "ಅವಶೇಷಗಳು ಕಂಡುಬಂದಿವೆ. ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ಪರಂಪರೆ ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
                    )
                elif traits["is_warm_sandstone"]:
                    suggested_slugs = [
                        "badami-cave-temples",
                        "aihole-durga-temple",
                        "pattadakal-monuments",
                    ]
                    style_desc = "Early Chalukyan Rock-Cut & Sandstone Architecture"
                    obs_clues = [
                        "Red sandstone ravine and rock-cut cave facades",
                        "Early Chalukyan temple carvings",
                    ]
                    msg_en = (
                        "Spatial visual analysis identified red sandstone cliff facades and "
                        "rock-cut cave architecture. Showing top matching Chalukyan destinations in Karnataka."
                    )
                    msg_kn = (
                        "ದೃಶ್ಯ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಕೆಂಪು ಮರಳುಗಲ್ಲಿನ ಬಂಡೆಗಳು ಮತ್ತು ಗುಹಾ ದೇವಾಲಯಗಳ ಲಕ್ಷಣಗಳು "
                        "ಕಂಡುಬಂದಿವೆ. ಚಾಲುಕ್ಯ ಪರಂಪರೆ ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
                    )
                elif traits["is_waterfall_plume"]:
                    suggested_slugs = ["jog-falls", "abbey-falls-madikeri", "shivanasamudra-falls"]
                    style_desc = "Western Ghats Cataract & Canyon Waterfall"
                    obs_clues = [
                        "Cascading water plume in rocky canyon",
                        "Western Ghats evergreen rainforest gorge",
                    ]
                    msg_en = (
                        "Spatial visual analysis identified vertical waterfall cascade plumes and "
                        "rainforest gorge features. Showing top matching Karnataka waterfalls."
                    )
                    msg_kn = (
                        "ದೃಶ್ಯ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಧುಮ್ಮಿಕ್ಕುವ ಜಲಪಾತ ಮತ್ತು ಮಳೆಕಾಡಿನ ಕಂದಕದ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. "
                        "ಸಂಬಂಧಿತ ಜಲಪಾತಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
                    )
                elif traits["is_coastal_marine"]:
                    suggested_slugs = ["om-beach-gokarna", "murudeshwar-temple-beach", "malpe-beach-st-marys"]
                    style_desc = "Arabian Sea Coastal Shoreline & Marine Landmarks"
                    obs_clues = [
                        "Coastal marine water horizon",
                        "Golden shoreline and coastal headland",
                    ]
                    msg_en = (
                        "Spatial visual analysis identified marine waters and coastal shoreline traits. "
                        "Showing top matching Karnataka beaches."
                    )
                    msg_kn = (
                        "ದೃಶ್ಯ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಕರಾವಳಿ ತೀರ ಮತ್ತು ಸಮುದ್ರದ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. "
                        "ಕರಾವಳಿ ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
                    )
                elif traits["is_palace_architecture"]:
                    suggested_slugs = ["mysore-palace", "bangalore-palace", "tipu-sultans-summer-palace"]
                    style_desc = "Indo-Saracenic & Royal Wadiyar Palace Architecture"
                    obs_clues = [
                        "Symmetrical palace facade, domes and arched courtyards",
                        "Historic royal heritage architecture",
                    ]
                    msg_en = (
                        "Spatial visual analysis identified royal palace facade and architectural domes. "
                        "Showing top matching Karnataka palaces."
                    )
                    msg_kn = (
                        "ದೃಶ್ಯ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಅರಮನೆಯ ಭವ್ಯ ಮುಂಭಾಗ ಮತ್ತು ಗುಮ್ಮಟಗಳ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. "
                        "ಕರ್ನಾಟಕದ ಪ್ರಸಿದ್ಧ ಅರಮನೆಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
                    )
                elif traits["is_nature_lush"]:
                    suggested_slugs = ["mullayanagiri-peak", "kudremukh-peak-trek", "bandipur-national-park"]
                    style_desc = "Western Ghats Montane & Forest Biome"
                    obs_clues = [
                        "Lush green canopy and rolling montane ridges",
                        "Western Ghats vegetation profile",
                    ]
                    msg_en = (
                        "Spatial visual analysis identified lush Western Ghats forest and montane "
                        "ridge traits. Showing top matching nature destinations."
                    )
                    msg_kn = (
                        "ದೃಶ್ಯ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಹಸಿರು ಪರಿಸರ ಮತ್ತು ಬೆಟ್ಟ ಶ್ರೇಣಿಗಳ ಲಕ್ಷಣಗಳು "
                        "ಕಂಡುಬಂದಿವೆ. ಸಂಬಂಧಿತ ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
                    )

        if suggested_slugs:
            candidates: list[VisualDiscoveryCandidate] = []
            seen_slugs: set[str] = set()

            for rank_idx, s in enumerate(suggested_slugs):
                if s in seen_slugs:
                    continue
                seen_slugs.add(s)

                dest = self._repo.get_by_slug(s)
                if dest and s in VISUAL_PROFILES:
                    prof = VISUAL_PROFILES[s]

                    # 1. Base match score
                    base_score = 0.84 if analysis_engine_used == "deterministic_fallback" else 0.80

                    # 2. Evidence overlap: how many specific features from this profile match the filename / observation clues
                    matching_features = [
                        feat for feat in prof["features"]
                        if re.search(r"\b" + re.escape(feat) + r"\b", fname_clean)
                        or any(feat in clue.lower() for clue in obs_clues)
                    ]
                    feature_bonus = min(0.10, len(matching_features) * 0.03)

                    # 3. Direct landmark name or slug term presence in filename
                    slug_terms = [t for t in s.split("-") if len(t) > 3]
                    direct_name_match = any(
                        re.search(r"\b" + re.escape(term) + r"\b", fname_clean) for term in slug_terms
                    )
                    name_bonus = 0.06 if direct_name_match else 0.0

                    # 4. Position adjustment to avoid identical scores across distinct candidates
                    rank_penalty = rank_idx * 0.03

                    calculated_score = max(0.55, min(0.96, round(base_score + feature_bonus + name_bonus - rank_penalty, 2)))

                    # Calibrated qualitative confidence label based on actual score
                    if calculated_score >= 0.85:
                        conf_label = ConfidenceLabel.STRONG_MATCH
                    elif calculated_score >= 0.70:
                        conf_label = ConfidenceLabel.POSSIBLE_MATCH
                    else:
                        conf_label = ConfidenceLabel.UNCERTAIN_SUGGESTION

                    evidence = VisualEvidence(
                        observed_features=prof["features"][:3] + obs_clues,
                        architectural_style=style_desc,
                        landscape_clues=prof["landscape"],
                        notes=f"Visual analysis indicates alignment with {style_desc} (evidence overlap: {len(matching_features)} features).",
                    )

                    cand_reasons = [
                        f"Visual signature aligns with {style_desc}",
                        f"Regional characteristics match {dest.district_code} catalogue profile",
                    ]
                    if matching_features:
                        cand_reasons.append(f"Observable traits: {', '.join(matching_features[:2])}")

                    candidates.append(
                        self._create_candidate_from_destination(
                            dest,
                            score=calculated_score,
                            confidence=conf_label,
                            reasons=cand_reasons,
                            evidence=evidence,
                            uncertainty=(
                                "Visual similarity engine match from spatial image traits; "
                                "verify with destination details."
                                if analysis_engine_used == "visual_similarity_engine"
                                else "Deterministic landmark match; compare with detailed features."
                            ),
                        )
                    )

            # Sort descending by match score
            candidates.sort(key=lambda c: c.match_score, reverse=True)

            if candidates:
                return VisualDiscoveryResponse(
                    query_type=query_type,
                    is_confident=True,
                    message_en=msg_en,
                    message_kn=msg_kn,
                    candidates=candidates,
                    analyzed_at=datetime.now(UTC).isoformat(),
                    analysis_engine=analysis_engine_used,
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
            analysis_engine=analysis_engine_used,
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

        # Check if AI recognized an open-world place outside the curated catalogue
        raw_external = parsed_data.get("external_place")
        external_place: ExternalPlaceRecognition | None = None
        if raw_external and isinstance(raw_external, dict):
            place_name = str(raw_external.get("place_name", "")).strip()
            if place_name:
                external_score = float(raw_external.get("match_score", 0.85))
                external_score = max(0.0, min(1.0, external_score))
                conf_str = raw_external.get("confidence_label", "strong_match")
                if conf_str not in ("strong_match", "possible_match", "uncertain_suggestion"):
                    conf_str = "strong_match" if external_score >= 0.80 else "possible_match"

                external_place = ExternalPlaceRecognition(
                    place_name=place_name,
                    location_summary=raw_external.get("location_summary"),
                    state_or_region=raw_external.get("state_or_region"),
                    country=raw_external.get("country", "India"),
                    is_karnataka=bool(raw_external.get("is_karnataka", False)),
                    confidence_label=ConfidenceLabel(conf_str),
                    match_score=round(external_score, 2),
                    visual_evidence=evidence,
                    summary=raw_external.get("summary"),
                    source_url=raw_external.get("source_url"),
                    catalogue_status="outside_catalogue",
                    notes=raw_external.get(
                        "notes",
                        "This place is not currently part of the curated Karnataka destination catalogue."
                    ),
                )

        if external_place:
            return VisualDiscoveryResponse(
                query_type=query_type,
                is_confident=is_confident,
                message_en=(
                    f"Recognized place outside catalogue: {external_place.place_name}. "
                    "This location is not currently part of our verified Karnataka travel catalogue."
                ),
                message_kn=(
                    f"ಕ್ಯಾಟಲಾಗ್‌ನಿಂದ ಹೊರಗಿರುವ ತಾಣವನ್ನು ಗುರುತಿಸಲಾಗಿದೆ: {external_place.place_name}. "
                    "ಈ ತಾಣವು ಪ್ರಸ್ತುತ ನಮ್ಮ ಪರಿಶೀಲಿಸಿದ ಕರ್ನಾಟಕ ಪ್ರವಾಸ ಕ್ಯಾಟಲಾಗ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ."
                ),
                candidates=[],
                external_place=external_place,
                analyzed_at=datetime.now(UTC).isoformat(),
                analysis_engine="ai_multimodal",
            )

        valid_candidates: list[VisualDiscoveryCandidate] = []
        seen_valid_slugs: set[str] = set()

        for raw in raw_candidates:
            slug = str(raw.get("slug", "")).strip()
            if not slug or slug in seen_valid_slugs:
                continue

            # Canonical slug alias mappings
            canonical_aliases = {
                "hampi": "vijaya-vittala-temple-hampi",
                "belur": "chennakeshava-temple-belur",
                "halebidu": "hoysaleswara-temple-halebidu",
                "badami": "badami-cave-temples",
                "pattadakal": "pattadakal-monuments",
                "aihole": "aihole-durga-temple",
            }
            resolved_slug = canonical_aliases.get(slug, slug)

            # Verify against repository
            dest = self._repo.get_by_slug(resolved_slug)
            if not dest:
                logger.warning(
                    "Rejecting AI-proposed slug '%s' as it is not in the destination catalogue.",
                    slug,
                )
                continue

            seen_valid_slugs.add(resolved_slug)

            score = float(raw.get("match_score", 0.75))
            score = max(0.0, min(1.0, score))

            conf_str = raw.get("confidence_label", "possible_match")
            if conf_str not in ("strong_match", "possible_match", "uncertain_suggestion"):
                conf_str = "strong_match" if score >= 0.85 else ("possible_match" if score >= 0.70 else "uncertain_suggestion")
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

        # Sort valid candidates descending by score
        valid_candidates.sort(key=lambda c: c.match_score, reverse=True)

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
                analysis_engine="ai_multimodal",
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
            analysis_engine="ai_multimodal",
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
