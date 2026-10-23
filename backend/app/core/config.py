"""Application configuration with environment-driven settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration settings for Namma Karnataka."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Namma Karnataka API"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    # Supabase (Optional placeholders for initial scaffold)
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_JWT_SECRET: str | None = None

    # AI Providers & Orchestration
    AI_PLANNING_ENABLED: bool = False
    GROQ_ENABLED: bool = False
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_ENABLED: bool = False
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    AI_PREFERRED_PROVIDER: str = "groq"
    AI_PROVIDER_TIMEOUT_SECONDS: int = 12
    AI_GLOBAL_DEADLINE_SECONDS: int = 28
    AI_MAX_RETRIES: int = 0
    AI_EXECUTION_MODE: str = "primary_then_fallback"
    AI_ENABLE_LIVE_PROVIDERS: bool = False

    # Routing
    ROUTING_PROVIDER: str = "osrm"
    OSRM_BASE_URL: str = "https://router.project-osrm.org"

    @property
    def is_groq_configured(self) -> bool:
        """Return True if Groq is enabled and has a non-placeholder key."""
        return (
            self.GROQ_ENABLED
            and bool(self.GROQ_API_KEY)
            and not str(self.GROQ_API_KEY).startswith("placeholder")
        )

    @property
    def is_gemini_configured(self) -> bool:
        """Return True if Gemini is enabled and has a non-placeholder key."""
        return (
            self.GEMINI_ENABLED
            and bool(self.GEMINI_API_KEY)
            and not str(self.GEMINI_API_KEY).startswith("placeholder")
        )


settings = Settings()
