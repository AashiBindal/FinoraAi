"""Tool registry: the single place the agent discovers and executes tools."""

import json
import time
from typing import Any

from app.tools.base import Tool, ToolContext, ToolInputError, ToolResult
from app.tools.builtin import BUILTIN_TOOLS


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if not tool.name:
            raise ValueError("Tool must have a name")
        if tool.name in self._tools:
            raise ValueError(f"Tool '{tool.name}' already registered")
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def all(self) -> list[Tool]:
        return list(self._tools.values())

    def names(self) -> list[str]:
        return list(self._tools)

    def describe_for_prompt(self) -> str:
        lines = []
        for t in self._tools.values():
            lines.append(f"- {t.name}: {t.description}\n  input schema: {json.dumps(t.parameters)}")
        return "\n".join(lines) or "(no tools registered)"

    async def execute(self, name: str, args: dict[str, Any], ctx: ToolContext) -> tuple[ToolResult, int]:
        """Run a tool safely. Never raises; errors come back as ToolResult(ok=False)."""
        start = time.perf_counter()
        tool = self.get(name)
        if tool is None:
            result = ToolResult(ok=False, error=f"Unknown tool '{name}'. Available: {', '.join(self.names())}")
        else:
            try:
                result = await tool.run(ctx, **tool.validate(args or {}))
            except ToolInputError as exc:
                result = ToolResult(ok=False, error=f"Invalid input: {exc}")
            except Exception as exc:  # tool bugs must not crash the agent loop
                result = ToolResult(ok=False, error=f"{type(exc).__name__}: {exc}")
        return result, int((time.perf_counter() - start) * 1000)


def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    for tool_cls in BUILTIN_TOOLS:
        registry.register(tool_cls())
    # Register hackathon-specific tools here, e.g.:
    # registry.register(WeatherTool(client=WeatherClient(...)))
    return registry


_default_registry: ToolRegistry | None = None


def get_registry() -> ToolRegistry:
    global _default_registry
    if _default_registry is None:
        _default_registry = build_default_registry()
    return _default_registry
