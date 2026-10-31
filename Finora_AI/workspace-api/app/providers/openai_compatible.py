"""OpenAI-compatible Chat Completions provider.

Works with OpenAI and any service exposing the same `/chat/completions`
API (Groq, OpenRouter, Together, Mistral, local Ollama/LM Studio, ...).
Set AI_BASE_URL to point at a non-OpenAI endpoint.
"""

import httpx

from app.providers.base import ChatMessage, LLMProvider, LLMResponse, ProviderError

DEFAULT_BASE_URL = "https://api.openai.com/v1"


class OpenAICompatibleProvider(LLMProvider):
    name = "openai"

    def __init__(self, model: str, **kwargs):
        super().__init__(model, **kwargs)
        self.base_url = self.base_url or DEFAULT_BASE_URL

    async def complete(self, system: str, messages: list[ChatMessage]) -> LLMResponse:
        payload = {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.role, "content": m.content} for m in messages],
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:  # local servers (Ollama) may not need a key
            headers["Authorization"] = f"Bearer {self.api_key}"

        resp = await self._post(payload, headers)
        # Some newer models reject `max_tokens` / custom `temperature`: retry once without them.
        if resp.status_code == 400 and ("max_tokens" in resp.text or "temperature" in resp.text):
            payload.pop("temperature", None)
            payload["max_completion_tokens"] = payload.pop("max_tokens", self.max_tokens)
            resp = await self._post(payload, headers)
        if resp.status_code >= 400:
            raise ProviderError(f"Provider returned HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        try:
            text = data["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"Unexpected response shape: {str(data)[:300]}") from exc
        return LLMResponse(text=text, model=data.get("model", self.model), usage=data.get("usage", {}))

    async def _post(self, payload: dict, headers: dict) -> httpx.Response:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                return await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise ProviderError(f"Could not reach {self.base_url}: {exc}") from exc
