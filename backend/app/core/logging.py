"""Structured and secret-safe logging configuration."""

import contextvars
import logging
import re
import sys

# Context variable to hold the active request ID for the current async task
request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)

# Regex patterns for sensitive key/token masking
SENSITIVE_PATTERNS = [
    re.compile(r"(?i)(bearer\s+)[a-zA-Z0-9_\-\.]{10,}"),
    re.compile(r"(?i)(api[_-]?key[\"'\s:=]+)[a-zA-Z0-9_\-\.]{8,}"),
    re.compile(r"(?i)(password[\"'\s:=]+)[^\"'\s,]+"),
    re.compile(r"(?i)(secret[\"'\s:=]+)[^\"'\s,]+"),
]


class SecretMaskingFormatter(logging.Formatter):
    """Log formatter that injects request_id and redacts sensitive tokens."""

    def format(self, record: logging.LogRecord) -> str:
        # Inject request_id if available in context
        req_id = request_id_ctx.get()
        record.request_id = req_id if req_id else "-"

        formatted = super().format(record)

        # Mask sensitive strings
        for pattern in SENSITIVE_PATTERNS:
            formatted = pattern.sub(r"\1***REDACTED***", formatted)

        return formatted


def setup_logging(log_level: str = "INFO") -> None:
    """Initialize structured application logging."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear existing handlers to prevent duplicate lines
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)

    formatter = SecretMaskingFormatter(
        fmt="[%(asctime)s] [%(levelname)s] [req:%(request_id)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Quiet overly chatty third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named application logger."""
    return logging.getLogger(name)
