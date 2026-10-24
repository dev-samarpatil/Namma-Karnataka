"""AI Visual Place Discovery API v1 router."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from app.core.errors import AppError
from app.repositories.destinations import DestinationRepository, get_destination_repository
from app.schemas.visual_discovery import VisualDiscoveryResponse
from app.services.visual_discovery.service import VisualDiscoveryService

router = APIRouter(prefix="/visual-discovery", tags=["visual-discovery"])


def get_visual_discovery_service(
    repo: Annotated[DestinationRepository, Depends(get_destination_repository)],
) -> VisualDiscoveryService:
    """Dependency provider for VisualDiscoveryService."""
    return VisualDiscoveryService(repo=repo)


@router.post(
    "/analyze-image",
    response_model=VisualDiscoveryResponse,
    summary="Discover Karnataka destinations from an uploaded photograph",
)
async def analyze_image(
    file: Annotated[UploadFile, File(description="Photograph file (JPEG, PNG, WebP)")],
    language: Annotated[str, Form(description="Response language ('en' or 'kn')")] = "en",
    service: Annotated[VisualDiscoveryService, Depends(get_visual_discovery_service)] = None,
) -> VisualDiscoveryResponse:
    """Analyze a user photograph, extract visual clues, and ground candidates in the destination catalogue.

    User media is processed ephemerally in memory without persistent storage.
    """
    if not file:
        raise AppError(
            code="MISSING_FILE",
            message="No image file provided for visual discovery.",
            status_code=400,
        )

    # Read file content safely
    content = await file.read()
    return await service.analyze_image(content, filename=file.filename, language=language)


@router.post(
    "/analyze-video",
    response_model=VisualDiscoveryResponse,
    summary="Discover Karnataka destinations from sampled video keyframes",
)
async def analyze_video(
    frames: Annotated[
        list[UploadFile] | None,
        File(description="Sampled keyframes extracted from travel video (max 5 frames)"),
    ] = None,
    file: Annotated[
        UploadFile | None,
        File(description="Single short video or preview clip"),
    ] = None,
    language: Annotated[str, Form(description="Response language ('en' or 'kn')")] = "en",
    service: Annotated[VisualDiscoveryService, Depends(get_visual_discovery_service)] = None,
) -> VisualDiscoveryResponse:
    """Analyze short video keyframes and aggregate visual observations across moments."""
    frames_bytes: list[bytes] = []

    if frames:
        for f in frames[:5]:
            data = await f.read()
            if data:
                frames_bytes.append(data)
    elif file:
        data = await file.read()
        if data:
            frames_bytes.append(data)

    if not frames_bytes:
        raise AppError(
            code="MISSING_MEDIA",
            message="No video frames or media file provided for video discovery.",
            status_code=400,
        )

    return await service.analyze_video(frames_bytes, language=language)
