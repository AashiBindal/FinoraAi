"""Glue between the API layer and the agent runtime.

Builds the runtime from settings, runs it, persists the run and logs
activity. Routes call `run_agent` and never touch the runtime directly.
"""

import time

from sqlalchemy.orm import Session

from app.agents.memory import DatabaseMemory
from app.agents.runtime import AgentRuntime
from app.core.config import Settings
from app.models import AgentRun
from app.providers import build_provider, config_problem
from app.services.activity import log_activity
from app.tools.base import ToolContext
from app.tools.registry import ToolRegistry, get_registry


def build_runtime(db: Session, settings: Settings, registry: ToolRegistry | None = None) -> AgentRuntime:
    return AgentRuntime(
        provider=build_provider(settings),
        tools=registry or get_registry(),
        memory=DatabaseMemory(db),
        max_steps=settings.agent_max_steps,
        not_configured_reason=config_problem(settings) or "",
    )


async def run_agent(
    db: Session, settings: Settings, message: str, session_id: str = "default", runtime: AgentRuntime | None = None
) -> AgentRun:
    runtime = runtime or build_runtime(db, settings)
    start = time.perf_counter()
    result = await runtime.run(message, ToolContext(db=db, session_id=session_id))
    run = AgentRun(
        session_id=session_id,
        input=message,
        output=result.output,
        status=result.status,
        provider=result.provider,
        model=result.model,
        steps=[s.to_dict() for s in result.steps],
        error=result.error,
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    db.add(run)
    if result.status != "not_configured":
        tools_used = sorted({s.tool for s in result.steps if s.type == "tool_call" and s.tool})
        suffix = f" using {', '.join(tools_used)}" if tools_used else ""
        log_activity(db, "agent", f"Agent run {result.status}{suffix}")
    db.commit()
    db.refresh(run)
    return run
