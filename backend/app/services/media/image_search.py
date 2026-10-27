"""Dynamic destination image search and deduplication service via Wikimedia Commons API."""

from __future__ import annotations

import html
import re
import time
from typing import Any

import httpx

from app.core.logging import get_logger
from app.repositories.destinations import DestinationRepository, get_destination_repository
from app.schemas.destinations import DestinationMedia, DestinationRead

logger = get_logger("app.services.media.image_search")

# Curated landmark sub-queries for major Karnataka tourism hubs
CURATED_LANDMARK_QUERIES: dict[str, list[str]] = {
    "mysore-palace": [
        "Mysore Palace exterior illumination",
        "Mysore Palace Durbar Hall interior",
        "Mysore Palace architecture Karnataka",
        "Amba Vilas Palace Mysore front view",
    ],
    "hampi": [
        "Hampi Virupaksha Temple tower",
        "Hampi Stone Chariot Vittala",
        "Hampi Hemakuta Hill sunset",
        "Hampi ancient ruins boulder landscape",
    ],
    "gol-gumbaz": [
        "Gol Gumbaz Bijapur dome exterior",
        "Gol Gumbaz whispering gallery interior",
        "Gol Gumbaz Vijayapura gardens",
    ],
    "badami-caves": [
        "Badami cave temples sandstone rock-cut",
        "Badami cave 1 Nataraja carving",
        "Agastya Lake Badami Karnataka",
    ],
    "jog-falls": [
        "Jog Falls Sharavathi river monsoon",
        "Jog Falls Raja Rani Roarer Rocket",
        "Jog Falls Shimoga scenic valley",
    ],
    "coorg-madikeri": [
        "Madikeri Fort Raja Seat Coorg",
        "Abbey Falls Kodagu Coorg",
        "Coorg coffee plantations Western Ghats",
    ],
    "belur-chennakeshava": [
        "Chennakeshava Temple Belur soapstone carving",
        "Belur temple Hoysala architecture",
        "Belur temple bracket figures Madanika",
    ],
    "halebidu-hoysaleswara": [
        "Hoysaleswara Temple Halebidu relief sculptures",
        "Halebidu temple stone frieze elephants",
        "Hoysala architecture Halebeedu",
    ],
    "pattadakal": [
        "Pattadakal temple complex UNESCO",
        "Virupaksha Temple Pattadakal stone carvings",
        "Mallikarjuna temple Pattadakal Chalukya",
    ],
    "murudeshwar": [
        "Murudeshwar Shiva statue Arabian Sea",
        "Murudeshwar Rajagopuram coastal Karnataka",
        "Murudeshwar beach temple tower",
    ],
    "gokarna": [
        "Gokarna Om Beach coastline",
        "Mahabaleshwar Temple Gokarna",
        "Kudle Beach Gokarna Karnataka cliffs",
    ],
}

# Image Search in-memory cache: slug -> (timestamp, list[DestinationMedia])
_SEARCH_CACHE: dict[str, tuple[float, list[DestinationMedia]]] = {}
_CACHE_TTL_SECONDS = 3600.0  # 1 hour cache


class DestinationImageSearchService:
    """End-to-end image search querying Wikimedia Commons for authentic destination photos."""

    def __init__(
        self,
        repository: DestinationRepository | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._repository = repository or get_destination_repository()
        self._client = client
        self._api_url = "https://commons.wikimedia.org/w/api.php"
        self._headers = {
            "User-Agent": (
                "NammaKarnatakaTravelApp/1.0 "
                "(https://karnataka.gov.in; tourism@nammakarnataka.org)"
            ),
            "Accept": "application/json",
        }

    def _get_queries_for_destination(self, dest: DestinationRead) -> list[str]:
        """Construct landmark-specific search queries using destination name, category, and district."""
        slug = dest.slug.lower()
        if slug in CURATED_LANDMARK_QUERIES:
            return CURATED_LANDMARK_QUERIES[slug]

        name_en = dest.name_en or dest.slug.replace("-", " ").title()
        district_name = dest.district.name_en if dest.district else ""

        category_val = dest.category.value if hasattr(dest.category, "value") else str(dest.category)
        queries: list[str] = []

        if category_val in ("heritage", "temple", "monument", "fort", "palace"):
            queries.extend([
                f"{name_en} exterior Karnataka",
                f"{name_en} architecture",
                f"{name_en} stone temple ruins",
            ])
        elif category_val in ("nature", "waterfall", "hill_station", "viewpoint"):
            queries.extend([
                f"{name_en} landscape viewpoint",
                f"{name_en} Karnataka scenic",
                f"{name_en} nature hills",
            ])
        elif category_val in ("wildlife", "national_park"):
            queries.extend([
                f"{name_en} wildlife safari",
                f"{name_en} national park sanctuary",
                f"{name_en} forest landscape",
            ])
        elif category_val in ("coastal", "beach"):
            queries.extend([
                f"{name_en} beach coastal Karnataka",
                f"{name_en} Arabian Sea coast",
            ])
        else:
            queries.extend([
                f"{name_en} {district_name} Karnataka",
                f"{name_en} landmark",
            ])

        if district_name and f"{name_en} {district_name}" not in queries:
            queries.append(f"{name_en} {district_name} Karnataka")

        return queries

    def _clean_html(self, raw_html: str | None) -> str:
        """Strip HTML tags and unescape entities from metadata."""
        if not raw_html:
            return ""
        clean = re.sub(r"<[^>]+>", "", str(raw_html))
        return html.unescape(clean).strip()

    def _normalize_canonical_key(self, url: str) -> str:
        """Derive a canonical deduplication key from a Wikimedia image URL."""
        # Strip query parameters
        clean = url.split("?")[0]
        # Normalize thumb URLs to source upload URLs:
        # e.g. https://upload.wikimedia.org/wikipedia/commons/thumb/a/b/Foo.jpg/800px-Foo.jpg -> Foo.jpg
        match = re.search(r"/wikipedia/commons/(?:thumb/)?(?:[a-f0-9]/[a-f0-9]{2}/)?([^/]+)", clean)
        if match:
            filename = match.group(1).replace(" ", "_").lower()
            # If thumb url, filename might be the directory name before the width prefix
            return filename
        return clean.split("/")[-1].replace(" ", "_").lower()

    async def _search_wikimedia_query(
        self,
        query: str,
        destination_id: str,
        limit: int = 6,
    ) -> list[DestinationMedia]:
        """Query Wikimedia Commons Action API for a single search string."""
        params: dict[str, Any] = {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "6",  # File: namespace only
            "gsrlimit": str(limit),
            "prop": "imageinfo",
            "iiprop": "url|size|extmetadata|mime",
            "iiurlwidth": "1200",
            "format": "json",
            "origin": "*",
        }

        try:
            if self._client is not None:
                resp = await self._client.get(
                    self._api_url,
                    params=params,
                    headers=self._headers,
                    timeout=8.0,
                )
            else:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        self._api_url,
                        params=params,
                        headers=self._headers,
                    )

            if resp.status_code != 200:
                logger.warning(
                    "Wikimedia query '%s' returned HTTP %d",
                    query,
                    resp.status_code,
                )
                return []

            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            if not pages:
                return []

            results: list[DestinationMedia] = []
            for page_id, page_data in pages.items():
                title = page_data.get("title", "")
                # Ignore non-photographic graphics
                title_lower = title.lower()
                if any(x in title_lower for x in [
                    "map", "coat of arms", "flag of", "seal of", "locator",
                    "diagram", "chart", "icon", "logo", "plan of", "sketch"
                ]):
                    continue

                imageinfo = page_data.get("imageinfo", [])
                if not imageinfo:
                    continue

                info = imageinfo[0]
                mime = info.get("mime", "")
                if mime not in ("image/jpeg", "image/png", "image/webp"):
                    continue

                width = info.get("width", 0)
                height = info.get("height", 0)
                if width < 360 or height < 240:
                    continue

                source_url = info.get("url", "")
                thumb_url = info.get("thumburl", "") or source_url
                if not source_url.startswith("https://upload.wikimedia.org/"):
                    continue

                extmeta = info.get("extmetadata", {})
                artist_raw = extmeta.get("Artist", {}).get("value") or extmeta.get("Credit", {}).get("value")
                artist = self._clean_html(artist_raw) or "Wikimedia Commons Contributor"
                license_raw = extmeta.get("LicenseShortName", {}).get("value") or extmeta.get("UsageTerms", {}).get("value")
                license_name = self._clean_html(license_raw) or "Creative Commons"
                desc_raw = extmeta.get("ImageDescription", {}).get("value")
                desc = self._clean_html(desc_raw) or title.replace("File:", "").replace(".jpg", "").replace(".png", "")

                media_id = f"wm-{page_id}"
                results.append(
                    DestinationMedia(
                        id=media_id,
                        destination_id=destination_id,
                        url=source_url,
                        thumbnail_url=thumb_url,
                        caption_en=desc[:160] if desc else title,
                        caption_kn=None,
                        alt_en=desc[:160] if desc else title,
                        alt_kn=None,
                        source_name="Wikimedia Commons",
                        license_type=license_name,
                        attribution=artist,
                        is_primary=False,
                        verification_status="verified_authentic",
                    )
                )

            return results
        except Exception as exc:
            logger.warning("Wikimedia search failed for query '%s': %s", query, exc)
            return []

    async def search_destination_images(
        self,
        id_or_slug: str,
        target_count: int = 7,
        force_refresh: bool = False,
    ) -> list[DestinationMedia]:
        """Search and assemble 5-8 distinct authentic photographs for a destination."""
        dest = self._repository.get_by_slug(id_or_slug) or self._repository.get_by_id(id_or_slug)
        if not dest:
            logger.warning("Destination '%s' not found for image search", id_or_slug)
            return []

        # Check Cache
        cache_key = dest.slug.lower()
        now = time.monotonic()
        if not force_refresh and cache_key in _SEARCH_CACHE:
            ts, cached_media = _SEARCH_CACHE[cache_key]
            if (now - ts) < _CACHE_TTL_SECONDS and len(cached_media) >= 3:
                return cached_media

        collected_media: list[DestinationMedia] = []
        seen_keys: set[str] = set()

        # 1. Incorporate verified seed media first
        if dest.media:
            for item in dest.media:
                ckey = self._normalize_canonical_key(item.url)
                if ckey not in seen_keys:
                    seen_keys.add(ckey)
                    collected_media.append(item)

        if not collected_media and dest.primary_image_url:
            ckey = self._normalize_canonical_key(dest.primary_image_url)
            seen_keys.add(ckey)
            collected_media.append(
                DestinationMedia(
                    id=f"primary-{dest.id}",
                    destination_id=dest.id,
                    url=dest.primary_image_url,
                    thumbnail_url=dest.primary_image_url,
                    caption_en=dest.name_en,
                    caption_kn=dest.name_kn,
                    alt_en=dest.name_en,
                    alt_kn=dest.name_kn,
                    source_name="Official Wikimedia / Karnataka Tourism",
                    license_type="Creative Commons",
                    attribution="Wikimedia Commons / Karnataka Tourism",
                    is_primary=True,
                    verification_status="verified_authentic",
                )
            )

        # 2. If we already have 6+ verified images, cache and return
        if len(collected_media) >= target_count:
            _SEARCH_CACHE[cache_key] = (now, collected_media[:target_count])
            return collected_media[:target_count]

        # 3. Dynamic search across landmark-specific queries
        queries = self._get_queries_for_destination(dest)
        logger.info(
            "Searching Wikimedia images for destination '%s' using queries: %s",
            dest.slug,
            queries,
        )

        for q in queries:
            if len(collected_media) >= target_count:
                break
            found_items = await self._search_wikimedia_query(
                query=q,
                destination_id=dest.id,
                limit=6,
            )
            for item in found_items:
                ckey = self._normalize_canonical_key(item.url)
                if ckey not in seen_keys:
                    seen_keys.add(ckey)
                    collected_media.append(item)
                    if len(collected_media) >= target_count:
                        break

        # Cache final results
        if collected_media:
            _SEARCH_CACHE[cache_key] = (now, collected_media)

        return collected_media
