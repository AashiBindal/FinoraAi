"""Provider abstraction: every LLM backend implements `LLMProvider`.

The agent runtime only depends on this interface, so switching between
OpenAI, Anthropic, Groq, a local Ollama model, etc. is a config change.
To add a provider: subclass LLMProvider, then register it in `factory.py`.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class ChatMessage:
    role: Literal["user", "assistant"]
    content: str


@dataclass
class LLMResponse:
    text: str
    model: str = ""
    usage: dict = field(default_factory=dict)


class ProviderError(Exception):
    """Raised when the upstream model API fails (network, auth, quota...)."""


class LLMProvider(ABC):
    name: str = "base"

    def __init__(
        self,
        model: str,
        api_key: str = "",
        base_url: str = "",
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout: float = 60.0,
    ):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout

    @abstractmethod
    async def complete(self, system: str, messages: list[ChatMessage]) -> LLMResponse:
        """Return the model's reply to `messages` given a `system` prompt."""
