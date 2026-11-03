"""Authentication and user context handling for Namma Karnataka.

Maintains backward compatibility with app.core.auth while routing
all cryptographic verification through app.core.security.
"""

from __future__ import annotations

from app.api.dependencies.auth import get_current_user, get_optional_user, security_bearer
from app.core.security import AuthenticatedUser, verify_jwt_token

__all__ = [
    "AuthenticatedUser",
    "get_current_user",
    "get_optional_user",
    "security_bearer",
    "verify_jwt_token",
]
