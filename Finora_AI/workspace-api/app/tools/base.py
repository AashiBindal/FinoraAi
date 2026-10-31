"""Tool interface.

A tool is a small, well-described capability the agent can call. Each tool
declares a JSON-schema for its input so the model knows how to call it and
so inputs can be validated before execution.

To add a tool:
    1. Create a file in app/tools/builtin/ (or app/tools/<your_domain>.py)
    2. Subclass `Tool`, set name/description/parameters, implement `run`
    3. Register it in app/tools/registry.py -> build_default_registry()
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


@dataclass
class ToolContext:
    """Runtime context handed to tools (DB session, session id, ...)."""

    db: "Session | None" = None
    session_id: str = "default"
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    ok: bool
    output: Any = None
    error: str = ""

    def as_text(self, limit: int = 4000) -> str:
        text = str(self.output) if self.ok else f"ERROR: {self.error}"
        return text if len(text) <= limit else text[:limit] + "... [truncated]"


class ToolInputError(ValueError):
    pass


class Tool(ABC):
    name: str = ""
    description: str = ""
    category: str = "general"
    # JSON schema: {"type": "object", "properties": {...}, "required": [...]}
    parameters: dict[str, Any] = {"type": "object", "properties": {}, "required": []}

    def validate(self, args: dict[str, Any]) -> dict[str, Any]:
        """Minimal validation: required keys present, no unknown keys."""
        if not isinstance(args, dict):
            raise ToolInputError("Tool input must be a JSON object")
        props = self.parameters.get("properties", {})
        missing = [k for k in self.parameters.get("required", []) if k not in args]
        if missing:
            raise ToolInputError(f"Missing required field(s): {', '.join(missing)}")
        unknown = [k for k in args if k not in props]
        if unknown:
            raise ToolInputError(f"Unknown field(s): {', '.join(unknown)}")
        return args

    @abstractmethod
    async def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult:
        ...

    def describe(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "parameters": self.parameters,
        }
