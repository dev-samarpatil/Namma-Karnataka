"""Pytest fixtures and environment configuration."""

import sys
from pathlib import Path

# Add project root to sys.path so data/ and other root packages are importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
