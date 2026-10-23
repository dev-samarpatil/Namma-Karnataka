"""Script to verify newly provided Supabase and Groq credentials.

Ensures zero secrets are printed.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import httpx  # noqa: E402

from app.core.config import Settings  # noqa: E402


def verify_groq(settings: Settings) -> None:
    print("\n--- Verifying Groq API ---")
    if not settings.GROQ_API_KEY:
        print("Groq API key is missing.")
        return

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a test assistant. Respond in JSON."},
            {"role": "user", "content": 'Respond with: {"status": "ok"}'},
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 50,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            print(f"Groq Model Tested: {settings.GROQ_MODEL}")
            print(f"HTTP Status: {resp.status_code}")
            if resp.status_code == 200:
                print("Groq Status: PASS")
                print(f"Response: {resp.json()['choices'][0]['message']['content']}")
            else:
                print("Groq Status: FAIL")
                try:
                    err = resp.json().get("error", {})
                    print(f"Error Code: {err.get('code')}")
                    print(f"Error Message: {err.get('message')}")
                except Exception:
                    print(f"Raw Response: {resp.text[:200]}")

            # Check accessible models
            models_resp = client.get("https://api.groq.com/openai/v1/models", headers=headers)
            if models_resp.status_code == 200:
                available_ids = [m["id"] for m in models_resp.json().get("data", [])]
                print(f"Total Groq Models Available on Account: {len(available_ids)}")
                # Find llama models
                llama_models = [m for m in available_ids if "llama" in m.lower()]
                print(f"Available LLaMA Models: {llama_models}")
                print(f"Sample Other Models: {available_ids[:5]}")
            else:
                print(f"Failed to fetch models: HTTP {models_resp.status_code}")
    except Exception as exc:
        print(f"Groq Exception: {type(exc).__name__}: {exc}")


def verify_supabase(settings: Settings) -> None:
    print("\n--- Verifying Supabase Credentials & Database ---")
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("Supabase URL or service role key missing.")
        return

    raw_url = settings.SUPABASE_URL.rstrip("/")
    if raw_url.endswith("/rest/v1"):
        raw_url = raw_url[:-len("/rest/v1")]

    base_url = raw_url
    print(f"Target Supabase Host: {base_url}")

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    # 1. Test PostgREST OpenAPI schema / liveness
    try:
        with httpx.Client(timeout=10.0) as client:
            schema_resp = client.get(f"{base_url}/rest/v1/", headers=headers)
            print(f"PostgREST Root Probe HTTP Status: {schema_resp.status_code}")

            # 2. Check if districts table exists
            districts_url = f"{base_url}/rest/v1/districts?select=code,name_en&limit=5"
            districts_resp = client.get(districts_url, headers=headers)
            print(f"Query 'districts' table HTTP Status: {districts_resp.status_code}")
            if districts_resp.status_code == 200:
                data = districts_resp.json()
                print(f"Districts Found: {len(data)} (e.g., {[d.get('code') for d in data]})")
            else:
                print(f"Districts Query Response: {districts_resp.text[:300]}")

            # 3. Check if destinations table exists
            dest_url = f"{base_url}/rest/v1/destinations?select=id,slug,name_en&limit=5"
            dest_resp = client.get(dest_url, headers=headers)
            print(f"Query 'destinations' table HTTP Status: {dest_resp.status_code}")
            if dest_resp.status_code == 200:
                data = dest_resp.json()
                print(f"Destinations Found: {len(data)}")
            else:
                print(f"Destinations Query Response: {dest_resp.text[:300]}")

    except Exception as exc:
        print(f"Supabase Exception: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    settings = Settings()
    verify_groq(settings)
    verify_supabase(settings)
