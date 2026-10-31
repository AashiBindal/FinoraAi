"""Builds the configured LLM provider from settings (or None if not configured)."""

from app.core.config import Settings
from app.providers.anthropic import AnthropicProvider
from app.providers.base import LLMProvider
from app.providers.openai_compatible import OpenAICompatibleProvider

PROVIDERS: dict[str, type[LLMProvider]] = {
    "openai": OpenAICompatibleProvider,
    "anthropic": AnthropicProvider,
}
SUPPORTED_PROVIDERS = ["none", *PROVIDERS.keys()]


def config_problem(settings: Settings) -> str | None:
    """Return a human-readable reason the provider is unusable, or None if OK."""
    provider = settings.ai_provider.lower().strip()
    if provider in ("", "none"):
        return "No AI provider configured. Set AI_PROVIDER, AI_MODEL and AI_API_KEY in .env, then restart the backend."
    if provider not in PROVIDERS:
        return f"Unknown AI_PROVIDER '{provider}'. Supported: {', '.join(SUPPORTED_PROVIDERS)}."
    if not settings.ai_model:
        return "AI_MODEL is empty. Set it to a model ID your provider supports."
    # A key is required except for OpenAI-compatible local servers with a custom base URL
    if not settings.ai_api_key and not (provider == "openai" and settings.ai_base_url):
        return "AI_API_KEY is empty. Add your key to .env (never commit it)."
    return None


def build_provider(settings: Settings) -> LLMProvider | None:
    if config_problem(settings):
        return None
    cls = PROVIDERS[settings.ai_provider.lower().strip()]
    return cls(
        api_key=settings.ai_api_key,
        base_url=settings.ai_base_url,
        model=settings.ai_model,
        temperature=settings.ai_temperature,
        max_tokens=settings.ai_max_tokens,
        timeout=settings.ai_timeout_seconds,
    )
