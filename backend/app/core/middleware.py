"""Request ID and telemetry middleware."""

import re
import uuid
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger, request_id_ctx

logger = get_logger("app.middleware.request_id")

# Whitelist alphanumeric, underscore, and hyphens (8 to 64 chars)
VALID_REQUEST_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{8,64}$")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Middleware that assigns a unique request ID to each HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        incoming_id = request.headers.get("X-Request-ID")
        if incoming_id and VALID_REQUEST_ID_PATTERN.match(incoming_id):
            request_id = incoming_id
        else:
            request_id = f"req-{uuid.uuid4().hex[:16]}"

        request.state.request_id = request_id
        token = request_id_ctx.set(request_id)

        try:
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_ctx.reset(token)
