"""FastAPI authentication dependencies for protected routes.

Enforces secure bearer token extraction and verified identity derivation.
Never trusts request payloads for ownership.
"""

from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.core.security import AuthenticatedUser, verify_jwt_token

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> AuthenticatedUser:
    """Dependency requiring an authenticated user.

    Extracts Bearer token and validates signature, expiration, and issuer.
    Raises HTTP 401 if token is missing, invalid, or expired.
    """
    if credentials is None or not credentials.credentials:
        raise AppError(
            code="UNAUTHORIZED",
            message="Authentication credentials were not provided",
            status_code=401,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await verify_jwt_token(credentials.credentials)


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> AuthenticatedUser | None:
    """Optional authentication dependency.

    Returns the AuthenticatedUser if valid token is provided, or None for guest requests.
    """
    if credentials is None or not credentials.credentials:
        return None

    try:
        return await verify_jwt_token(credentials.credentials)
    except AppError:
        return None
