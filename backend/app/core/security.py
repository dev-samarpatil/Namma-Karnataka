"""Core security and JWT verification services for Namma Karnataka.

Derives authenticated user identity strictly from cryptographically verified tokens.
Never trusts client-supplied owner IDs or unverified claims.
"""

from __future__ import annotations

from typing import Any

import httpx
import jwt
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger

logger = get_logger("app.core.security")


class AuthenticatedUser(BaseModel):
    """Internal user context extracted from a verified token."""

    user_id: str
    email: str | None = None
    role: str = "authenticated"
    is_demo: bool = False
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    user_metadata: dict[str, Any] = Field(default_factory=dict)


async def verify_token_against_supabase_api(token: str) -> AuthenticatedUser:
    """Verify an access token directly against Supabase's /auth/v1/user endpoint.

    Serves as an authoritative verification mechanism and fallback for asymmetric (JWKS) keys.
    """
    if not settings.SUPABASE_URL or settings.SUPABASE_URL.startswith("placeholder"):
        raise AppError(
            code="AUTH_UNCONFIGURED",
            message="Supabase authentication service is not configured.",
            status_code=503,
        )

    clean_url = settings.SUPABASE_URL.rstrip("/")
    if clean_url.endswith("/rest/v1"):
        clean_url = clean_url[: -len("/rest/v1")]

    headers = {"Authorization": f"Bearer {token}"}
    if settings.SUPABASE_SERVICE_ROLE_KEY and not settings.SUPABASE_SERVICE_ROLE_KEY.startswith(
        "placeholder"
    ):
        headers["apikey"] = settings.SUPABASE_SERVICE_ROLE_KEY

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(f"{clean_url}/auth/v1/user", headers=headers)
            if res.status_code == 200:
                data = res.json()
                user_id = data.get("id")
                if not user_id:
                    raise AppError(
                        code="INVALID_CREDENTIALS",
                        message="Invalid user payload returned by authentication provider.",
                        status_code=401,
                    )
                return AuthenticatedUser(
                    user_id=user_id,
                    email=data.get("email"),
                    role=data.get("role", "authenticated"),
                    is_demo=False,
                    app_metadata=data.get("app_metadata") or {},
                    user_metadata=data.get("user_metadata") or {},
                )
            if res.status_code in (401, 403):
                logger.warning("Supabase Auth rejected token (HTTP %s)", res.status_code)
                raise AppError(
                    code="INVALID_CREDENTIALS",
                    message="Invalid or expired authentication token.",
                    status_code=401,
                )
            logger.warning("Supabase Auth returned unexpected status: %s", res.status_code)
            raise AppError(
                code="AUTH_PROVIDER_ERROR",
                message="Authentication provider encountered an error.",
                status_code=502,
            )
    except httpx.RequestError as exc:
        logger.error("Failed connecting to Supabase Auth endpoint: %s", type(exc).__name__)
        raise AppError(
            code="AUTH_UNAVAILABLE",
            message="Authentication service is temporarily unreachable.",
            status_code=503,
        ) from exc


async def verify_jwt_token(token: str) -> AuthenticatedUser:
    """Validate a Bearer token and return the verified AuthenticatedUser context.

    Enforces:
    1. Demo token restrictions (strictly blocked in production/staging environments).
    2. Local cryptographic verification via PyJWT using SUPABASE_JWT_SECRET (HS256).
    3. Expiration, issuer, and audience validation.
    4. Seamless fallback to Supabase /auth/v1/user for RS256/ECC or rotated keys.
    """
    clean_token = token.strip()
    if not clean_token:
        raise AppError(
            code="UNAUTHORIZED",
            message="Authentication credentials were not provided.",
            status_code=401,
        )

    # 1. Controlled Demo Mode handling
    if clean_token.startswith("test-token-user-"):
        # Strictly verify environment - DEMO tokens MUST NEVER be accepted in production
        allowed_envs = ("development", "test", "local")
        current_env = (settings.APP_ENV or "development").lower()
        if current_env not in allowed_envs:
            logger.warning("Demo token rejected in non-development environment '%s'", current_env)
            raise AppError(
                code="UNAUTHORIZED",
                message="Demo access tokens are not permitted in this environment.",
                status_code=401,
                headers={
                    "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Demo tokens not allowed in production"'
                },
            )

        suffix = clean_token[len("test-token-user-") :]
        test_uuid = f"00000000-0000-0000-0000-00000000000{suffix}" if len(suffix) == 1 else suffix
        return AuthenticatedUser(
            user_id=test_uuid,
            email=f"user-{suffix}@example.com",
            role="authenticated",
            is_demo=True,
            app_metadata={"provider": "demo"},
            user_metadata={"full_name": f"Demo User {suffix}"},
        )

    # 2. Structural sanity check for compact JWT format (header.payload.signature)
    if clean_token.count(".") != 2:
        logger.warning(
            "Bearer token rejected: malformed JWT structure (must contain exactly 3 dot-separated segments)"
        )
        raise AppError(
            code="INVALID_CREDENTIALS",
            message="Invalid or malformed authentication token.",
            status_code=401,
            headers={
                "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Malformed token format"'
            },
        )

    try:
        unverified_header = jwt.get_unverified_header(clean_token)
    except jwt.InvalidTokenError as exc:
        logger.warning("Bearer token rejected: invalid JWT header (%s)", exc)
        raise AppError(
            code="INVALID_CREDENTIALS",
            message="Invalid or malformed authentication token.",
            status_code=401,
            headers={
                "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Invalid token header"'
            },
        ) from exc

    alg = unverified_header.get("alg", "HS256")
    jwt_secret = settings.SUPABASE_JWT_SECRET
    has_jwt_secret = bool(jwt_secret and not jwt_secret.startswith("placeholder"))
    has_supabase_url = bool(
        settings.SUPABASE_URL and not settings.SUPABASE_URL.startswith("placeholder")
    )

    # 3. Local cryptographic JWT verification for HS256 tokens when secret is configured
    if alg == "HS256" and has_jwt_secret:
        try:
            # We allow a 15-second leeway for system clock drift across servers
            claims = jwt.decode(
                clean_token,
                key=jwt_secret,
                algorithms=["HS256"],
                leeway=15,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": False,  # Aud validated manually below for flexibility
                },
            )
            user_id = claims.get("sub")
            if not user_id:
                raise AppError(
                    code="INVALID_CREDENTIALS",
                    message="Token missing subject identifier (sub).",
                    status_code=401,
                    headers={
                        "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Missing subject claim"'
                    },
                )

            # Validate audience if aud claim exists (Supabase uses 'authenticated')
            aud = claims.get("aud")
            if aud and aud not in ("authenticated", "anon"):
                logger.warning("Token audience mismatch: %s", aud)
                raise AppError(
                    code="INVALID_CREDENTIALS",
                    message="Token audience is invalid.",
                    status_code=401,
                    headers={
                        "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Audience mismatch"'
                    },
                )

            return AuthenticatedUser(
                user_id=str(user_id),
                email=claims.get("email"),
                role=claims.get("role", "authenticated"),
                is_demo=False,
                app_metadata=claims.get("app_metadata") or {},
                user_metadata=claims.get("user_metadata") or {},
            )
        except jwt.ExpiredSignatureError as exc:
            logger.info("Access token expired")
            raise AppError(
                code="TOKEN_EXPIRED",
                message="Authentication token has expired. Please sign in again.",
                status_code=401,
                headers={
                    "WWW-Authenticate": 'Bearer error="invalid_token", error_description="The token has expired"'
                },
            ) from exc
        except jwt.InvalidSignatureError as exc:
            logger.warning("HS256 token signature verification failed: %s", exc)
            raise AppError(
                code="INVALID_CREDENTIALS",
                message="Invalid or incorrectly signed authentication token.",
                status_code=401,
                headers={
                    "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Invalid signature"'
                },
            ) from exc
        except jwt.InvalidTokenError as exc:
            logger.warning("HS256 token validation failed: %s", exc)
            raise AppError(
                code="INVALID_CREDENTIALS",
                message="Invalid authentication token.",
                status_code=401,
                headers={
                    "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Invalid token"'
                },
            ) from exc

    # 4. Asymmetric or rotated keys fallback to Supabase /auth/v1/user endpoint
    if has_supabase_url:
        return await verify_token_against_supabase_api(clean_token)

    # 5. Fallback when Supabase URL is not configured
    if has_jwt_secret:
        # Secret is available for HS256, but token specifies unsupported algorithm
        logger.warning("Unsupported token algorithm '%s' without remote Supabase URL", alg)
        raise AppError(
            code="INVALID_CREDENTIALS",
            message=f"Unsupported token algorithm '{alg}'.",
            status_code=401,
            headers={
                "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Unsupported algorithm"'
            },
        )

    # Neither secret nor Supabase URL is configured: infrastructure failure
    raise AppError(
        code="AUTH_UNCONFIGURED",
        message="Supabase authentication service is not configured.",
        status_code=503,
    )
