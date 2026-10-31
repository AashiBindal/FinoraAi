"""Agent layer: reasoning loop, memory, prompts and orchestration.

Kept independent from FastAPI routes and the frontend. Entry point for the
API is `service.run_agent`.
"""

from app.agents.runtime import AgentRuntime
from app.agents.service import build_runtime, run_agent

__all__ = ["AgentRuntime", "build_runtime", "run_agent"]
