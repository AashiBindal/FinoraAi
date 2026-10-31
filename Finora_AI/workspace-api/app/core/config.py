"""Application settings.

All configuration comes from environment variables (or a `.env` file).
Never hardcode secrets here - add them to `.env` (git-ignored) instead.
See `.env.example` at the repository root for every supported variable.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Reads the repo-root .env; an optional backend/.env overrides it.
        # (Later files win.) Real environment variables override both.
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    app_name: str = "AgentForge API"
    app_env: str = "development"
    debug: bool = True

    # --- Database ---
    # SQLite by default. Switch to PostgreSQL with e.g.
    # postgresql+psycopg://user:pass@localhost:5432/agentforge
    database_url: str = "sqlite:///./agentforge.db"

    # Seed the database with clearly-labelled sample data on first start
    seed_sample_data: bool = True

    # --- CORS ---
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- AI provider ---
    # One of: none | openai | anthropic
    # "openai" works with any OpenAI-compatible endpoint (OpenAI, Groq,
    # OpenRouter, Together, local Ollama / LM Studio, ...) via AI_BASE_URL.
    ai_provider: str = "none"
    ai_model: str = ""
    ai_api_key: str = ""
    ai_base_url: str = ""
    ai_temperature: float = 0.2
    ai_max_tokens: int = 1024
    ai_timeout_seconds: float = 60.0

    # --- Agent runtime ---
    agent_max_steps: int = 6

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
