"""Agent endpoints. All agent logic lives in app/agents - this file only wires HTTP."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.agents import run_agent
from app.api.deps import get_db, get_or_404
from app.core.config import get_settings
from app.core.errors import AppError
from app.models import AgentRun
from app.providers import SUPPORTED_PROVIDERS, config_problem
from app.schemas import AgentConfigRead, AgentRunRead, AgentRunRequest, ToolRead
from app.tools import get_registry

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/config", response_model=AgentConfigRead)
def agent_config():
    """Which provider/model is configured. Never returns the API key."""
    s = get_settings()
    problem = config_problem(s)
    return AgentConfigRead(
        provider=s.ai_provider,
        model=s.ai_model,
        configured=problem is None,
        base_url=s.ai_base_url,
        max_steps=s.agent_max_steps,
        message=problem or f"Agent connected to {s.ai_provider} ({s.ai_model}).",
        supported_providers=SUPPORTED_PROVIDERS,
    )


@router.get("/tools", response_model=list[ToolRead])
def list_tools():
    return [ToolRead(**t.describe()) for t in get_registry().all()]


@router.post("/run", response_model=AgentRunRead)
async def run(payload: AgentRunRequest, db: Session = Depends(get_db)):
    """Run the agent once. Returns status `not_configured` when no model is set."""
    return await run_agent(db, get_settings(), payload.message, payload.session_id)


@router.post("/stream")
async def stream():
    """Placeholder for streaming (SSE) responses - see docs/AGENT_ARCHITECTURE.md."""
    err = AppError("Streaming is not implemented yet. Use POST /api/agent/run.")
    err.status_code, err.code = 501, "not_implemented"
    raise err


@router.get("/runs", response_model=list[AgentRunRead])
def list_runs(session_id: str = "default", limit: int = 50, db: Session = Depends(get_db)):
    limit = max(1, min(limit, 200))
    runs = db.scalars(
        select(AgentRun).where(AgentRun.session_id == session_id).order_by(AgentRun.id.desc()).limit(limit)
    ).all()
    return list(reversed(runs))


@router.get("/runs/{run_id}", response_model=AgentRunRead)
def get_run(run_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, AgentRun, run_id, "Agent run")


@router.delete("/runs", status_code=204)
def clear_runs(session_id: str = "default", db: Session = Depends(get_db)):
    db.execute(delete(AgentRun).where(AgentRun.session_id == session_id))
    db.commit()
    return Response(status_code=204)
