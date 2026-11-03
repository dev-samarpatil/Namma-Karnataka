"""Central path resolution helpers for seed data, media cache, and static assets."""

from __future__ import annotations

from pathlib import Path


def get_seed_data_path(filename: str) -> Path | None:
    """Resolve seed JSON file across local repo, backend root, container paths, and CWD."""
    base_file = Path(__file__).resolve()
    candidates = [
        base_file.parents[3] / "data" / "seed" / filename,
        base_file.parents[2] / "data" / "seed" / filename,
        Path("/app/data/seed") / filename,
        Path.cwd() / "data" / "seed" / filename,
        Path.cwd() / "backend" / "data" / "seed" / filename,
        base_file.parents[1] / "data" / "seed" / filename,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]
