"""Centralized exception classes and global error handlers."""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger, request_id_ctx
from app.schemas.common import ErrorDetail, ErrorResponse

logger = get_logger("app.core.errors")


class AppException(Exception):
    """Base application exception with standardized code and HTTP status."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: list[dict[str, Any]] | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


# Backward-compatible alias
AppError = AppException


class ValidationError(AppException):
    """Request data failed domain validation."""

    def __init__(
        self,
        message: str = "Invalid request parameters.",
        details: list[dict[str, Any]] | None = None,
    ):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class NotFoundError(AppException):
    """Requested resource was not found."""

    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(AppException):
    """Authentication required or failed."""

    def __init__(self, message: str = "Authentication required."):
        super().__init__(
            code="UNAUTHENTICATED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(AppException):
    """Access forbidden to this resource."""

    def __init__(self, message: str = "You do not have permission to access this resource."):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class DependencyUnavailableError(AppException):
    """An external service dependency is unreachable."""

    def __init__(self, message: str = "A required upstream service is currently unavailable."):
        super().__init__(
            code="DEPENDENCY_UNAVAILABLE",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def _get_request_id(request: Request) -> str | None:
    """Retrieve the correlation request ID from request state or logging context."""
    req_id = getattr(request.state, "request_id", None)
    return req_id or request_id_ctx.get()


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions."""
    request_id = _get_request_id(request)
    logger.warning("Application error: %s - %s", exc.code, exc.message)
    response_payload = ErrorResponse(
        error=ErrorDetail(
            code=exc.code,
            message=exc.message,
            request_id=request_id,
            details=exc.details,
        )
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=response_payload.model_dump(exclude_none=True),
        headers={"X-Request-ID": request_id} if request_id else None,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle FastAPI and Pydantic validation errors with normalized envelope."""
    request_id = _get_request_id(request)
    details: list[dict[str, Any]] = []
    for err in exc.errors():
        loc = " -> ".join(str(item) for item in err.get("loc", []))
        details.append(
            {
                "location": loc,
                "message": err.get("msg", "Invalid value"),
                "type": err.get("type", "value_error"),
            }
        )

    logger.warning("Validation failed for request %s: %s", request_id, details)
    response_payload = ErrorResponse(
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="Request validation failed. Check your parameters.",
            request_id=request_id,
            details=details,
        )
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_payload.model_dump(exclude_none=True),
        headers={"X-Request-ID": request_id} if request_id else None,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard HTTP exceptions with normalized envelope."""
    request_id = _get_request_id(request)
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHENTICATED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    logger.warning("HTTP %d: %s", exc.status_code, exc.detail)

    response_payload = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=str(exc.detail),
            request_id=request_id,
        )
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=response_payload.model_dump(exclude_none=True),
        headers={"X-Request-ID": request_id} if request_id else None,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected internal exceptions, preventing stack trace leaks."""
    request_id = _get_request_id(request)
    logger.exception("Unhandled server exception processing request %s", request_id)

    response_payload = ErrorResponse(
        error=ErrorDetail(
            code="INTERNAL_ERROR",
            message="An unexpected server error occurred. Please try again later.",
            request_id=request_id,
        )
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_payload.model_dump(exclude_none=True),
        headers={"X-Request-ID": request_id} if request_id else None,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register all centralized exception handlers with the FastAPI application."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
