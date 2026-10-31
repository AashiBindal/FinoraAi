"""Anthropic Messages API provider (Claude models)."""

import httpx

from app.providers.base import ChatMessage, LLMProvider, LLMResponse, ProviderError

DEFAULT_BASE_URL = "https://api.anthropic.com/v1"
API_VERSION = "2023-06-01"


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, model: str, **kwargs):
        super().__init__(model, **kwargs)
        self.base_url = self.base_url or DEFAULT_BASE_URL

    async def complete(self, system: str, messages: list[ChatMessage]) -> LLMResponse:
        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "system": system,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
        }
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": API_VERSION,
            "content-type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(f"{self.base_url}/messages", json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise ProviderError(f"Could not reach Anthropic API: {exc}") from exc
        if resp.status_code >= 400:
            raise ProviderError(f"Anthropic returned HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
        return LLMResponse(text=text, model=data.get("model", self.model), usage=data.get("usage", {}))
