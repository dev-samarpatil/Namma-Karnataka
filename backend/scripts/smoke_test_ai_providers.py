"""Controlled smoke test script for live AI providers (Groq and Gemini).

Executes a minimal test against configured cloud providers to verify live API reachability,
authentication, and structured JSON generation.
SECURITY: Never logs, prints, or exposes API keys or raw authorization headers.
"""

import asyncio
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402
from app.repositories.destinations import InMemoryDestinationRepository  # noqa: E402
from app.schemas.destinations import DestinationFilterParams  # noqa: E402
from app.schemas.planning import PlanningRequest  # noqa: E402
from app.services.ai.gemini_adapter import GeminiAdapter  # noqa: E402
from app.services.ai.groq_adapter import GroqAdapter  # noqa: E402
from app.services.ai.validator import parse_and_ground_plan  # noqa: E402


async def smoke_test_provider(provider, name: str, model_id: str, request, candidates) -> dict:
    start_time = time.monotonic()
    try:
        raw_text = await provider.generate_plan(request, candidates, timeout_seconds=12.0)
        grounded = parse_and_ground_plan(raw_text, candidates, request.language)
        duration = round(time.monotonic() - start_time, 2)
        return {
            "name": name,
            "status": "PASS",
            "model": model_id,
            "duration_s": duration,
            "grounded_count": len(grounded),
            "error": None,
        }
    except Exception as exc:
        duration = round(time.monotonic() - start_time, 2)
        error_name = type(exc).__name__
        sanitized_msg = str(exc)
        return {
            "name": name,
            "status": "FAIL",
            "model": model_id,
            "duration_s": duration,
            "grounded_count": 0,
            "error": f"{error_name} ({sanitized_msg})",
        }


async def main():
    print("=" * 60)
    print("NAMMA KARNATAKA - LIVE AI PROVIDER SMOKE TEST")
    print("=" * 60)

    repo = InMemoryDestinationRepository()
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=10), published_only=True)
    req = PlanningRequest(duration_days=1, pace="relaxed")

    # 1. Groq Smoke Test
    print("\n--- 1. Groq Provider ---")
    if settings.is_groq_configured:
        groq = GroqAdapter()
        res_groq = await smoke_test_provider(groq, "Groq", settings.GROQ_MODEL, req, candidates)
        print(f"Status:          {res_groq['status']}")
        print(f"Model:           {res_groq['model']}")
        print(f"Duration:        {res_groq['duration_s']}s")
        if res_groq["status"] == "PASS":
            print(f"Grounded Stops:  {res_groq['grounded_count']}")
        else:
            print(f"Failure Reason:  {res_groq['error']}")
    else:
        print("Status: NOT RUN — Missing or unconfigured GROQ_API_KEY in .env")

    # 2. Gemini Smoke Test
    print("\n--- 2. Google Gemini Provider ---")
    if settings.is_gemini_configured:
        gemini = GeminiAdapter()
        res_gemini = await smoke_test_provider(
            gemini, "Gemini", settings.GEMINI_MODEL, req, candidates
        )
        print(f"Status:          {res_gemini['status']}")
        print(f"Model:           {res_gemini['model']}")
        print(f"Duration:        {res_gemini['duration_s']}s")
        if res_gemini["status"] == "PASS":
            print(f"Grounded Stops:  {res_gemini['grounded_count']}")
        else:
            print(f"Failure Reason:  {res_gemini['error']}")
    else:
        print("Status: NOT RUN — Missing or unconfigured GEMINI_API_KEY in .env")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
